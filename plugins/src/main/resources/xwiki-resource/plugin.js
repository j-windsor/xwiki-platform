/*
 * See the NOTICE file distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation; either version 2.1 of
 * the License, or (at your option) any later version.
 *
 * This software is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this software; if not, write to the Free
 * Software Foundation, Inc., 51 Franklin St, Fifth Floor, Boston, MA
 * 02110-1301 USA, or see the FSF site: http://www.fsf.org.
 */
(function (){
  'use strict';
  var $ = jQuery;
  CKEDITOR.plugins.add('xwiki-resource', {
    parseResourceReference: function(serializedResourceReference) {
      // TODO: Add support for resource parameters.
      var parts = serializedResourceReference.split('|-|', 3);
      if (parts.length === 3) {
        return {
          typed: parts[0] === 'true',
          type: parts[1],
          reference: parts[2]
        };
      }
      return null;
    },

    serializeResourceReference: function(resourceReference) {
      // TODO: Add support for resource parameters.
      return [
        !!resourceReference.typed,
        resourceReference.type,
        resourceReference.reference
      ].join('|-|');
    },

    replaceWithResourcePicker: function(dialogDefinition, replacedElementId, pickerDefinition) {
      hideParentAndInsertAfter(dialogDefinition, replacedElementId, createResourcePicker(pickerDefinition));
    },

    updateResourcePickerOnFileBrowserSelect: function(dialogDefinition, resourcePickerElementId, fileBrowserElementId) {
      var fileBrowserElement = dialogDefinition.getContents(fileBrowserElementId[0]).get(fileBrowserElementId[1]);
      if (fileBrowserElement && fileBrowserElement.filebrowser) {
        var fileBrowserConfig = fileBrowserElement.filebrowser;
        if (typeof fileBrowserConfig === 'string') {
          fileBrowserConfig = {target: fileBrowserConfig};
          fileBrowserElement.filebrowser = fileBrowserConfig;
        }
        var oldOnSelect = fileBrowserConfig.onSelect;
        fileBrowserConfig.onSelect = function(fileURL, data) {
          if (data.resourceReference) {
            // Update the resource picker.
            this.getDialog().setValueOf(resourcePickerElementId[0], resourcePickerElementId[1], data.resourceReference);
          }
          if (typeof oldOnSelect === 'function') {
            return oldOnSelect.call(this, fileURL, data);
          }
        };
      }
    }
  });

  var knownResourceTypes = {
    attach: {
      label: 'Attachment',
      icon: 'glyphicon glyphicon-paperclip',
      placeholder: 'Path.To.Page@attachment.png'
    },
    icon: {
      label: 'Icon',
      icon: 'glyphicon glyphicon-flag',
      placeholder: 'help'
    },
    unknown: {
      label: 'Unknown',
      icon: 'glyphicon glyphicon-question-sign',
    },
    url: {
      label: 'URL',
      icon: 'glyphicon glyphicon-globe',
      placeholder: 'http://www.example.org/image.png'
    }
  };

  var createResourcePicker = function(elementDefinition) {
    return CKEDITOR.tools.extend(elementDefinition || {}, {
      //
      // Standard fields
      //
      id: 'resourceReference',
      type: 'html',
      html: '<div>' +
              '<label class="cke_dialog_ui_labeled_label">Location</label>' +
              '<div class="resourcePicker input-group">' +
                '<input type="text" class="resourceReference" />' +
                '<div class="input-group-btn">'+
                  '<button type="button" class="resourceType btn btn-default">' +
                    '<span class="icon">' +
                  '</button>' +
                  '<button type="button" class="btn btn-default dropdown-toggle" data-toggle="dropdown">' +
                    '<span class="caret"></span>' +
                  '</button>' +
                  '<ul class="dropdown-menu dropdown-menu-right"></ul>' +
                '</div>' +
              '</div>' +
            '</div>',
      focus: function() {
        this.getReferenceInput().focus();
      },
      onLoad: function() {
        // Fix the tab-key navigation.
        var resourceTypeDropDownToggle = this.getElement().findOne('.dropdown-toggle');
        this.getDialog().addFocusable(resourceTypeDropDownToggle, 0);
        this.getDialog().addFocusable(this.getTypeInput(), 0);
        this.getDialog().addFocusable(this.getReferenceInput(), 0);
        // Fix reference input id.
        var id = CKEDITOR.tools.getNextId();
        this.getReferenceInput().setAttribute('id', id);
        this.getElement().findOne('label').setAttribute('for', id);
        // Populate the Resource Type drop down.
        this.resourceTypes.forEach(this.addResourceType, this);
        // Add the JavaScript behaviour.
        addResourcePickerBehaviour($(this.getElement().$));
        // Select the default resource type.
        this.selectResourceType(this.resourceTypes[0]);
      },
      validate: function() {
        var reference = this.getReferenceInput().getValue();
        if (reference === '') {
          // Check if the selected resource type supports empty references.
          var resourceType = knownResourceTypes[this.getTypeInput().getValue()];
          if (resourceType.allowEmptyReference !== true) {
            return 'The image location is not specified.';
          }
        }
        return true;
      },
      getValue: function() {
        return {
          type: this.getTypeInput().getValue(),
          reference: this.getReferenceInput().getValue()
        };
      },
      setValue: function(resourceReference) {
        // Reset the input if no resource reference is provided.
        resourceReference = resourceReference || {type: this.resourceTypes[0]};
        this.selectResourceType(resourceReference.type);
        this.getReferenceInput().setValue(resourceReference.reference || '');
      },
      //
      // Custom fields
      //
      dropDownItemTemplate: new CKEDITOR.template('<li><a href="#" data-id="{id}" ' +
        'data-placeholder="{placeholder}"><span class="icon {icon}"></span> {label}</a></li>'),
      getTypeInput: function() {
        return this.getElement().findOne('.resourceType');
      },
      getReferenceInput: function() {
        return this.getElement().findOne('.resourceReference');
      },
      selectResourceType: function(resourceTypeId) {
        var resourceTypeAnchor = $(this.getElement().$).find('a').filter(function() {
          return $(this).attr('data-id') === resourceTypeId;
        });
        if (resourceTypeAnchor.length === 0) {
          // Unsupported resource type. We need to add it to the list before selecting it.
          this.addResourceType(resourceTypeId);
          resourceTypeAnchor = $(this.getElement().$).find('a').filter(function() {
            return $(this).attr('data-id') === resourceTypeId;
          });
        }
        resourceTypeAnchor.click();
      },
      addResourceType: function(resourceTypeId) {
        var resourceType = knownResourceTypes[resourceTypeId] || {
          label: resourceTypeId,
          icon: 'glyphicon glyphicon-question-sign'
        };
        resourceType.id = resourceTypeId;
        var dropDownMenu = this.getElement().findOne('.dropdown-menu');
        dropDownMenu.appendHtml(this.dropDownItemTemplate.output(resourceType));
      }
    });
  };

  var addResourcePickerBehaviour = function(picker) {
    var resourceReferenceInput = picker.find('input.resourceReference');
    var resourceTypeButton = picker.find('button.resourceType');
    var resourceTypeIcon = resourceTypeButton.find('.icon');
    picker.find('.dropdown-menu').on('click', 'a', function(event) {
      event.preventDefault();
      var selectedResourceType = $(event.target);
      resourceReferenceInput.attr('placeholder', selectedResourceType.attr('data-placeholder'));
      resourceTypeButton.val(selectedResourceType.attr('data-id'));
      resourceTypeButton.attr('title', selectedResourceType.text().trim());
      resourceTypeButton.prop('disabled', selectedResourceType.attr('href') === '#');
      resourceTypeIcon.attr('class', selectedResourceType.find('.icon').attr('class'));
    });
  };

  var hideParentAndInsertAfter = function(dialogDefinition, elementId, newElementDefinition) {
    var path = getUIElementPath(elementId, dialogDefinition.contents);
    if (path && path.length > 2) {
      // Override the commit function of the replaced element.
      var tabId = path[path.length - 1].element.id;
      var oldCommit = path[0].element.commit;
      path[0].element.commit = function() {
        var resourceReference = this.getDialog().getValueOf(tabId, newElementDefinition.id);
        if (resourceReference.type === 'url' || resourceReference.type === 'path') {
          this.setValue(resourceReference.reference);
        } else {
          // TODO: Make this URL configurable.
          this.setValue(new XWiki.Document('ResourceDispatcher', 'CKEditor').getURL('get', $.param(resourceReference)));
        }
        if (typeof oldCommit === 'function') {
          oldCommit.apply(this, arguments);
        }
      };
      // Hide the parent.
      path[1].element.hidden = true;
      // Insert new element after the hidden parent.
      path[2].element.children.splice(path[1].position, 0, newElementDefinition);
    }
  };

  var getUIElementPath = function(elementId, elements) {
    for (var i = 0; i < elements.length; i++) {
      var element = elements[i];
      if (element.id === elementId) {
        return [{element: element, position: i}];
      } else {
        var children = element.children || element.elements;
        if (children) {
          var path = getUIElementPath(elementId, children);
          if (path) {
            path.push({element: element, position: i});
            return path;
          }
        }
      }
    }
    return null;
  };
})();
