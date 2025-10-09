import type { LoaderFunctionArgs } from "react-router";

export async function loader({ request }: LoaderFunctionArgs) {
  // Generate LTI Tool Configuration XML
  const url = new URL(request.url);
  const baseUrl = `${url.protocol}//${url.host}`;

  const ltiConfigXml = `<?xml version="1.0" encoding="UTF-8"?>
<cartridge_basiclti_link 
  xmlns="http://www.imsglobal.org/xsd/imslticc_v1p0"
  xmlns:blti="http://www.imsglobal.org/xsd/imsbasiclti_v1p0"
  xmlns:lticm="http://www.imsglobal.org/xsd/imslticm_v1p0"
  xmlns:lticp="http://www.imsglobal.org/xsd/imslticp_v1p0">
  
  <blti:title>Northstar Academic Planner</blti:title>
  <blti:description>AI-powered academic planning and assignment tracking tool that helps students organize their coursework, track deadlines, and improve their academic performance.</blti:description>
  
  <blti:launch_url>${baseUrl}/api/lti/launch</blti:launch_url>
  <blti:secure_launch_url>${baseUrl}/api/lti/launch</blti:secure_launch_url>
  
  <blti:icon>${baseUrl}/favicon.png</blti:icon>
  <blti:secure_icon>${baseUrl}/favicon.png</blti:secure_icon>
  
  <blti:vendor>
    <lticp:code>northstar</lticp:code>
    <lticp:name>Northstar</lticp:name>
    <lticp:description>Academic planning and productivity tools for students</lticp:description>
    <lticp:url>https://northstar.app</lticp:url>
    <lticp:contact>
      <lticp:email>support@northstar.app</lticp:email>
    </lticp:contact>
  </blti:vendor>
  
  <!-- D2L Brightspace specific extensions -->
  <blti:extensions platform="brightspace.com">
    <lticm:property name="privacy_level">public</lticm:property>
    <lticm:property name="domain">${url.host}</lticm:property>
    
    <!-- Course Navigation -->
    <lticm:property name="course_navigation_enabled">true</lticm:property>
    <lticm:property name="course_navigation_text">Northstar Planner</lticm:property>
    <lticm:property name="course_navigation_visibility">admins,members</lticm:property>
    <lticm:property name="course_navigation_default">enabled</lticm:property>
    
    <!-- Account Navigation -->
    <lticm:property name="account_navigation_enabled">true</lticm:property>
    <lticm:property name="account_navigation_text">My Academic Planner</lticm:property>
    <lticm:property name="account_navigation_visibility">members</lticm:property>
    
    <!-- User Navigation -->
    <lticm:property name="user_navigation_enabled">true</lticm:property>
    <lticm:property name="user_navigation_text">Academic Planner</lticm:property>
    
    <!-- Assignment Selection -->
    <lticm:property name="assignment_selection_enabled">true</lticm:property>
    <lticm:property name="assignment_selection_text">Link to Northstar</lticm:property>
    <lticm:property name="assignment_selection_url">${baseUrl}/api/lti/assignment-selection</lticm:property>
    
    <!-- Editor Button -->
    <lticm:property name="editor_button_enabled">true</lticm:property>
    <lticm:property name="editor_button_text">Insert Northstar Content</lticm:property>
    <lticm:property name="editor_button_url">${baseUrl}/api/lti/editor</lticm:property>
    <lticm:property name="editor_button_icon_url">${baseUrl}/favicon.png</lticm:property>
    <lticm:property name="editor_button_selection_width">800</lticm:property>
    <lticm:property name="editor_button_selection_height">600</lticm:property>
  </blti:extensions>
  
  <!-- Canvas specific extensions (for broader compatibility) -->
  <blti:extensions platform="canvas.instructure.com">
    <lticm:property name="privacy_level">public</lticm:property>
    <lticm:property name="domain">${url.host}</lticm:property>
    
    <lticm:property name="course_navigation_enabled">true</lticm:property>
    <lticm:property name="course_navigation_text">Northstar</lticm:property>
    <lticm:property name="course_navigation_default">enabled</lticm:property>
    <lticm:property name="course_navigation_visibility">members</lticm:property>
    
    <lticm:property name="account_navigation_enabled">true</lticm:property>
    <lticm:property name="account_navigation_text">Academic Planner</lticm:property>
  </blti:extensions>
  
  <!-- Moodle specific extensions -->
  <blti:extensions platform="moodle.org">
    <lticm:property name="privacy_level">public</lticm:property>
    <lticm:property name="domain">${url.host}</lticm:property>
  </blti:extensions>
  
  <!-- Custom parameters that will be sent with launch -->
  <blti:custom>
    <lticm:property name="northstar_version">2.0</lticm:property>
    <lticm:property name="integration_type">lti</lticm:property>
  </blti:custom>
  
</cartridge_basiclti_link>`;

  return new Response(ltiConfigXml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
    },
  });
}




