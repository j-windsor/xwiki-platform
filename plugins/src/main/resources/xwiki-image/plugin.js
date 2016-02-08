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
  CKEDITOR.plugins.add('xwiki-image', {
    requires: 'xwiki-marker,xwiki-resource',

    init: function(editor) {
      editor.plugins['xwiki-marker'].addMarkerHandler(editor, 'image', {
        // comment: CKEDITOR.htmlParser.comment
        toHtml: function(comment) {
          if (comment.next && comment.next.name === 'img') {
            var reference = comment.value.substring('startimage:'.length);
            comment.next.attributes['data-reference'] = CKEDITOR.tools.unescapeComment(reference);
          }
        },
        // element: CKEDITOR.htmlParser.element
        isMarked: function(element) {
          return element.name === 'img' && element.attributes['data-reference'];
        },
        // image: CKEDITOR.htmlParser.element
        toDataFormat: function(image) {
          var reference = CKEDITOR.tools.escapeComment(image.attributes['data-reference']);
          var startImageComment = new CKEDITOR.htmlParser.comment('startimage:' + reference);
          var stopImageComment = new CKEDITOR.htmlParser.comment('stopimage');
          startImageComment.insertBefore(image);
          stopImageComment.insertAfter(image);
          delete image.attributes['data-reference'];
        }
      });
    },

    afterInit: function(editor) {
      this.overrideUploadImageWidget(editor);
      this.overrideImageWidget(editor);
    },

    /**
     * Overrides the Upload Image widget definition to include the image markers.
     */
    overrideUploadImageWidget: function(editor) {
      var uploadImageWidget = editor.widgets.registered.uploadimage;
      if (!uploadImageWidget) {
        return;
      }

      var originalOnUploaded = uploadImageWidget.onUploaded;
      uploadImageWidget.onUploaded = function(upload) {
        var response = JSON.parse(upload.xhr.responseText);
        this.parts.img.setAttribute('data-reference', CKEDITOR.plugins.get('xwiki-resource')
          .serializeResourceReference(response.resourceReference));
        originalOnUploaded.call(this, upload);
      };

      var originalReplaceWith = uploadImageWidget.replaceWith;
      uploadImageWidget.replaceWith = function(data, mode) {
        var reference = this.parts.img.getAttribute('data-reference');
        if (typeof reference === 'string') {
          var startImageMarker = '<!--startimage:' + CKEDITOR.tools.escapeComment(reference) + '-->';
          var stopImageMarker = '<!--stopimage-->';
          data = startImageMarker + data + stopImageMarker;
        }
        originalReplaceWith.call(this, data, mode);
      };
    },

    overrideImageWidget: function(editor) {
      var imageWidget = editor.widgets.registered.image;
      if (!imageWidget) {
        return;
      }

      var originalInit = imageWidget.init;
      imageWidget.init = function() {
        originalInit.call(this);
        var serializedResourceReference = this.parts.image.getAttribute('data-reference');
        if (serializedResourceReference) {
          this.setData('resourceReference', CKEDITOR.plugins.get('xwiki-resource')
            .parseResourceReference(serializedResourceReference));
        }
      };

      var originalData = imageWidget.data;
      imageWidget.data = function() {
        var resourceReference = this.data.resourceReference;
        if (resourceReference) {
          this.parts.image.setAttribute('data-reference', CKEDITOR.plugins.get('xwiki-resource')
            .serializeResourceReference(resourceReference));
        }
        originalData.call(this);
      };
    },
  });

  CKEDITOR.on('dialogDefinition', function(event) {
    // Make sure we affect only the editors that load this plugin.
    if (!event.editor.plugins['xwiki-image']) {
      return;
    }

    // Take the dialog window name and its definition from the event data.
    var dialogName = event.data.name;
    var dialogDefinition = event.data.definition;
    if (dialogName === 'image2') {
      CKEDITOR.plugins.get('xwiki-resource').replaceWithResourcePicker(dialogDefinition, 'src', {
        resourceTypes: ['attach', 'icon', 'url'],
        setup: function(widget) {
          this.setValue(widget.data.resourceReference);
        },
        commit: function(widget) {
          var oldResourceReference = widget.data.resourceReference || {};
          var newResourceReference = this.getValue();
          if (oldResourceReference.type !== newResourceReference.type ||
              oldResourceReference.reference !== newResourceReference.reference) {
            newResourceReference.typed = newResourceReference.type !== 'attach' &&
              (newResourceReference.type !== 'url' || newResourceReference.reference.indexOf('://') < 0);
            widget.setData('resourceReference', CKEDITOR.tools.extend(newResourceReference, oldResourceReference));
          }
        }
      });
      CKEDITOR.plugins.get('xwiki-resource').updateResourcePickerOnFileBrowserSelect(dialogDefinition,
        ['info', 'resourceReference'], ['Upload', 'uploadButton']);
    }
  });
})();
