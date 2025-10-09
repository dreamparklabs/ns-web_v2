// Email notification service using Resend API
import { Resend } from 'resend';

export interface EmailPreferences {
  assignments: boolean;
  events: boolean;
  dailyUpdates: boolean;
  weeklyDigest: boolean;
  urgentNotifications: boolean;
}

export interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody: string;
}

export interface AssignmentNotificationData {
  assignmentName: string;
  courseName: string;
  dueDate: string;
  assignmentUrl: string;
  instructorName?: string;
}

export interface EventNotificationData {
  eventName: string;
  eventDate: string;
  eventTime: string;
  eventLocation?: string;
  eventUrl: string;
}

export interface DailyUpdateData {
  assignmentsDue: number;
  eventsToday: number;
  upcomingAssignments: Array<{
    name: string;
    course: string;
    dueDate: string;
  }>;
  upcomingEvents: Array<{
    name: string;
    time: string;
    location?: string;
  }>;
}

class EmailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(process.env.RESEND_API_KEY);
  }

  /**
   * Send assignment notification email
   */
  async sendAssignmentNotification(
    email: string,
    data: AssignmentNotificationData
  ): Promise<boolean> {
    try {
      const template = this.generateAssignmentEmailTemplate(data);
      
      await this.resend.emails.send({
        from: 'Northstar <onboarding@resend.dev>',
        to: [email],
        subject: template.subject,
        html: template.htmlBody,
      });

      console.log('Assignment notification sent to:', email);
      return true;
    } catch (error) {
      console.error('Failed to send assignment notification:', error);
      return false;
    }
  }

  /**
   * Send event notification email
   */
  async sendEventNotification(
    email: string,
    data: EventNotificationData
  ): Promise<boolean> {
    try {
      const template = this.generateEventEmailTemplate(data);
      
      await this.resend.emails.send({
        from: 'Northstar <onboarding@resend.dev>',
        to: [email],
        subject: template.subject,
        html: template.htmlBody,
      });

      console.log('Event notification sent to:', email);
      return true;
    } catch (error) {
      console.error('Failed to send event notification:', error);
      return false;
    }
  }

  /**
   * Send daily update email
   */
  async sendDailyUpdate(
    email: string,
    data: DailyUpdateData
  ): Promise<boolean> {
    try {
      const template = this.generateDailyUpdateEmailTemplate(data);
      
      await this.resend.emails.send({
        from: 'Northstar <onboarding@resend.dev>',
        to: [email],
        subject: template.subject,
        html: template.htmlBody,
      });

      console.log('Daily update sent to:', email);
      return true;
    } catch (error) {
      console.error('Failed to send daily update:', error);
      return false;
    }
  }

  /**
   * Generate assignment email template
   */
  private generateAssignmentEmailTemplate(data: AssignmentNotificationData): EmailTemplate {
    const subject = `Assignment Reminder: ${data.assignmentName}`;
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #8B5CF6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .assignment-card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #8B5CF6; }
          .button { display: inline-block; background: #8B5CF6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📚 Assignment Reminder</h1>
          </div>
          <div class="content">
            <h2>${data.assignmentName}</h2>
            <div class="assignment-card">
              <p><strong>Course:</strong> ${data.courseName}</p>
              <p><strong>Due Date:</strong> ${data.dueDate}</p>
              ${data.instructorName ? `<p><strong>Instructor:</strong> ${data.instructorName}</p>` : ''}
            </div>
            <p>Don't forget to complete your assignment before the due date!</p>
            <a href="${data.assignmentUrl}" class="button">View Assignment</a>
            <div class="footer">
              <p>This is an automated notification from Northstar.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `
Assignment Reminder: ${data.assignmentName}

Course: ${data.courseName}
Due Date: ${data.dueDate}
${data.instructorName ? `Instructor: ${data.instructorName}` : ''}

Don't forget to complete your assignment before the due date!

View Assignment: ${data.assignmentUrl}

This is an automated notification from Northstar.
    `;

    return { subject, htmlBody, textBody };
  }

  /**
   * Generate event email template
   */
  private generateEventEmailTemplate(data: EventNotificationData): EmailTemplate {
    const subject = `Event Reminder: ${data.eventName}`;
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .event-card { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #10B981; }
          .button { display: inline-block; background: #10B981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📅 Event Reminder</h1>
          </div>
          <div class="content">
            <h2>${data.eventName}</h2>
            <div class="event-card">
              <p><strong>Date:</strong> ${data.eventDate}</p>
              <p><strong>Time:</strong> ${data.eventTime}</p>
              ${data.eventLocation ? `<p><strong>Location:</strong> ${data.eventLocation}</p>` : ''}
            </div>
            <p>Don't miss this important event!</p>
            <a href="${data.eventUrl}" class="button">View Event</a>
            <div class="footer">
              <p>This is an automated notification from Northstar.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `
Event Reminder: ${data.eventName}

Date: ${data.eventDate}
Time: ${data.eventTime}
${data.eventLocation ? `Location: ${data.eventLocation}` : ''}

Don't miss this important event!

View Event: ${data.eventUrl}

This is an automated notification from Northstar.
    `;

    return { subject, htmlBody, textBody };
  }

  /**
   * Generate daily update email template
   */
  private generateDailyUpdateEmailTemplate(data: DailyUpdateData): EmailTemplate {
    const subject = `Daily Update - ${data.assignmentsDue} assignments due, ${data.eventsToday} events today`;
    
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          .summary { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #3B82F6; }
          .section { margin: 20px 0; }
          .item { background: white; padding: 15px; margin: 10px 0; border-radius: 6px; border: 1px solid #e5e7eb; }
          .button { display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📊 Daily Update</h1>
            <p>Your academic summary for today</p>
          </div>
          <div class="content">
            <div class="summary">
              <h3>Today's Summary</h3>
              <p><strong>Assignments Due:</strong> ${data.assignmentsDue}</p>
              <p><strong>Events Today:</strong> ${data.eventsToday}</p>
            </div>

            ${data.upcomingAssignments.length > 0 ? `
            <div class="section">
              <h3>📚 Upcoming Assignments</h3>
              ${data.upcomingAssignments.map(assignment => `
                <div class="item">
                  <strong>${assignment.name}</strong><br>
                  <span style="color: #666;">${assignment.course} - Due: ${assignment.dueDate}</span>
                </div>
              `).join('')}
            </div>
            ` : ''}

            ${data.upcomingEvents.length > 0 ? `
            <div class="section">
              <h3>📅 Upcoming Events</h3>
              ${data.upcomingEvents.map(event => `
                <div class="item">
                  <strong>${event.name}</strong><br>
                  <span style="color: #666;">${event.time}${event.location ? ` - ${event.location}` : ''}</span>
                </div>
              `).join('')}
            </div>
            ` : ''}

            <a href="${window.location.origin}/app/v2/dashboard" class="button">Go to Dashboard</a>
            <div class="footer">
              <p>This is an automated daily update from Northstar.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const textBody = `
Daily Update - ${data.assignmentsDue} assignments due, ${data.eventsToday} events today

Today's Summary:
- Assignments Due: ${data.assignmentsDue}
- Events Today: ${data.eventsToday}

${data.upcomingAssignments.length > 0 ? `
Upcoming Assignments:
${data.upcomingAssignments.map(assignment => `- ${assignment.name} (${assignment.course}) - Due: ${assignment.dueDate}`).join('\n')}
` : ''}

${data.upcomingEvents.length > 0 ? `
Upcoming Events:
${data.upcomingEvents.map(event => `- ${event.name} - ${event.time}${event.location ? ` - ${event.location}` : ''}`).join('\n')}
` : ''}

Go to Dashboard: ${window.location.origin}/app/v2/dashboard

This is an automated daily update from Northstar.
    `;

    return { subject, htmlBody, textBody };
  }
}

export const emailService = new EmailService();
