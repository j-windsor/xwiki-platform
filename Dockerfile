FROM tomcat:9-jdk11-openjdk

ADD https://jdbc.postgresql.org/download/postgresql-42.4.2.jar /usr/local/tomcat/lib
COPY xwiki-platform-distribution/xwiki-platform-distribution-war/target/xwiki-platform-distribution-war-14.7-SNAPSHOT.war /usr/local/tomcat/webapps/xwiki.war