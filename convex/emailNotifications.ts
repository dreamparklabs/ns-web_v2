import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Get user email preferences
export const getUserEmailPreferences = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.emailPreferences || {
      assignments: true,
      events: true,
      dailyUpdates: true,
      weeklyDigest: true,
      urgentNotifications: true,
    };
  },
});

// Update user email preferences
export const updateUserEmailPreferences = mutation({
  args: {
    userId: v.id("users"),
    preferences: v.object({
      assignments: v.boolean(),
      events: v.boolean(),
      dailyUpdates: v.boolean(),
      weeklyDigest: v.boolean(),
      urgentNotifications: v.boolean(),
    }),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (user) {
      await ctx.db.patch(args.userId, { emailPreferences: args.preferences });
    }
  },
});

// Send assignment notification
export const sendAssignmentNotification = action({
  args: {
    userId: v.id("users"),
    assignmentId: v.id("assignments"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.getUserById, { userId: args.userId });
    const assignment = await ctx.runQuery(api.assignments.getAssignment, { assignmentId: args.assignmentId });
    
    if (!user || !assignment) {
      throw new Error("User or assignment not found");
    }

    // Check if user has assignment notifications enabled
    const preferences = user.emailPreferences;
    if (!preferences?.assignments) {
      console.log("Assignment notifications disabled for user:", user.clerkUserId);
      return;
    }

    // Format due date
    const dueDate = new Date(assignment.dueDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // Send email using Resend API
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Northstar <onboarding@resend.dev>',
          to: [user.email],
          subject: `Assignment Reminder: ${assignment.title}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Assignment Reminder</title>
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                  line-height: 1.6; 
                  color: #333; 
                  margin: 0; 
                  padding: 0; 
                  background-color: #ffffff;
                }
                .container { 
                  max-width: 600px; 
                  margin: 40px auto; 
                  background: white; 
                  padding: 0;
                }
                .header { 
                  background: #ffffff; 
                  color: #333; 
                  padding: 40px 40px 20px 40px; 
                  text-align: left; 
                }
                .header h1 { 
                  margin: 0; 
                  font-size: 24px; 
                  font-weight: 600; 
                  color: #333;
                }
                .content { 
                  padding: 0 40px 40px 40px; 
                }
                .assignment-title { 
                  font-size: 24px; 
                  font-weight: 600; 
                  color: #333; 
                  margin: 0 0 20px 0; 
                }
                .intro-text { 
                  color: #666; 
                  margin-bottom: 30px; 
                  font-size: 16px; 
                }
                .info-box { 
                  background: #f8f9fa; 
                  border-radius: 8px; 
                  padding: 20px; 
                  margin: 30px 0; 
                }
                .info-row { 
                  margin-bottom: 12px; 
                  font-size: 14px; 
                }
                .info-row:last-child { 
                  margin-bottom: 0; 
                }
                .info-label { 
                  font-weight: 600;
                  text-align: center;
                  border: none;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  transition: all 0.2s ease; 
                  color: #666; 
                }
                .info-value { 
                  color: #333; 
                  font-weight: 600;
                  text-align: center;
                  border: none;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  transition: all 0.2s ease; 
                }
                .cta-text { 
                  color: #666; 
                  margin: 30px 0 20px 0; 
                  font-size: 14px; 
                }
                .button { 
                  display: inline-block; 
                  background: #8B5CF6; 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 8px; 
                  font-weight: 600;
                  text-align: center;
                  border: none;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  transition: all 0.2s ease; 
                  font-size: 14px; 
                }
                .button:hover { 
                  background: #7C3AED; 
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
                  transform: translateY(-1px);
                }
                .footer { 
                  text-align: center; 
                  margin-top: 40px; 
                  padding-top: 20px; 
                  border-top: 1px solid #e5e7eb; 
                  color: #9ca3af; 
                  font-size: 12px; 
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>New assignment due soon</h1>
                </div>
                <div class="content">
                  <h2 class="assignment-title">${assignment.title}</h2>
                  <p class="intro-text">A new assignment just appeared in your Northstar account. If you don't recognize this assignment, please check your account for any unauthorized activity.</p>
                  
                  <div class="info-box">
                    <div class="info-row">
                      <span class="info-label">Course:</span> <span class="info-value">${assignment.courseName}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Due Date:</span> <span class="info-value">${dueDate}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Instructor:</span> <span class="info-value">${assignment.instructor}</span>
                    </div>
                  </div>
                  
                  <p class="cta-text">To immediately view this assignment click the button below.</p>
                  <a href="https://ns-web.vercel.app/app/v2/dashboard" class="button">Go to Dashboard</a>
                  
                  <div class="footer">
                    <p>This is an automated notification from Northstar.</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `,
        }),
      });

      if (response.ok) {
        console.log('Assignment notification sent successfully to:', user.clerkUserId);
      } else {
        console.error('Failed to send assignment notification:', await response.text());
      }
    } catch (error) {
      console.error('Error sending assignment notification:', error);
    }
  },
});

// Send event notification
export const sendEventNotification = action({
  args: {
    userId: v.id("users"),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const user = await ctx.runQuery(api.users.getUserById, { userId: args.userId });
    const event = await ctx.runQuery(api.events.getEvent, { eventId: args.eventId });
    
    if (!user || !event) {
      throw new Error("User or event not found");
    }

    // Check if user has event notifications enabled
    const preferences = user.emailPreferences;
    if (!preferences?.events) {
      console.log("Event notifications disabled for user:", user.clerkUserId);
      return;
    }

    // Format event date and time
    const eventDate = new Date(event.startDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const eventTime = new Date(event.startTime).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });

    // Send email using Resend API
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Northstar <onboarding@resend.dev>',
          to: [user.email],
          subject: `Event Reminder: ${event.title}`,
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Event Reminder</title>
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                  line-height: 1.6; 
                  color: #333; 
                  margin: 0; 
                  padding: 0; 
                  background-color: #ffffff;
                }
                .container { 
                  max-width: 600px; 
                  margin: 40px auto; 
                  background: white; 
                  padding: 0;
                }
                .header { 
                  background: #ffffff; 
                  color: #333; 
                  padding: 40px 40px 20px 40px; 
                  text-align: left; 
                }
                .header h1 { 
                  margin: 0; 
                  font-size: 24px; 
                  font-weight: 600; 
                  color: #333;
                }
                .content { 
                  padding: 0 40px 40px 40px; 
                }
                .event-title { 
                  font-size: 24px; 
                  font-weight: 600; 
                  color: #333; 
                  margin: 0 0 20px 0; 
                }
                .intro-text { 
                  color: #666; 
                  margin-bottom: 30px; 
                  font-size: 16px; 
                }
                .info-box { 
                  background: #f8f9fa; 
                  border-radius: 8px; 
                  padding: 20px; 
                  margin: 30px 0; 
                }
                .info-row { 
                  margin-bottom: 12px; 
                  font-size: 14px; 
                }
                .info-row:last-child { 
                  margin-bottom: 0; 
                }
                .info-label { 
                  font-weight: 600;
                  text-align: center;
                  border: none;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  transition: all 0.2s ease; 
                  color: #666; 
                }
                .info-value { 
                  color: #333; 
                  font-weight: 600;
                  text-align: center;
                  border: none;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  transition: all 0.2s ease; 
                }
                .cta-text { 
                  color: #666; 
                  margin: 30px 0 20px 0; 
                  font-size: 14px; 
                }
                .button { 
                  display: inline-block; 
                  background: #10B981; 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 8px; 
                  font-weight: 600;
                  text-align: center;
                  border: none;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  transition: all 0.2s ease; 
                  font-size: 14px; 
                }
                .button:hover { 
                  background: #059669; 
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
                  transform: translateY(-1px);
                }
                .footer { 
                  text-align: center; 
                  margin-top: 40px; 
                  padding-top: 20px; 
                  border-top: 1px solid #e5e7eb; 
                  color: #9ca3af; 
                  font-size: 12px; 
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>New event scheduled</h1>
                </div>
                <div class="content">
                  <h2 class="event-title">${event.title}</h2>
                  <p class="intro-text">A new event just appeared in your Northstar account. If you don't recognize this event, please check your account for any unauthorized activity.</p>
                  
                  <div class="info-box">
                    <div class="info-row">
                      <span class="info-label">Date:</span> <span class="info-value">${eventDate}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Time:</span> <span class="info-value">${eventTime}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Location:</span> <span class="info-value">${event.location || 'TBD'}</span>
                    </div>
                  </div>
                  
                  <p class="cta-text">To immediately view this event click the button below.</p>
                  <a href="https://ns-web.vercel.app/app/v2/calendar" class="button">View Calendar</a>
                  
                  <div class="footer">
                    <p>This is an automated notification from Northstar.</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `,
        }),
      });

      if (response.ok) {
        console.log('Event notification sent successfully to:', user.clerkUserId);
      } else {
        console.error('Failed to send event notification:', await response.text());
      }
    } catch (error) {
      console.error('Error sending event notification:', error);
    }
  },
});

// Send daily update to all users (simplified version)
export const sendDailyUpdates = action({
  args: {},
  handler: async (ctx) => {
    // For now, just log that this function was called
    // The full implementation will be added later once we have proper queries
    console.log('Daily updates function called - implementation pending');
    return { message: 'Daily updates function called successfully' };
  },
});

// Schedule daily updates (call this from a cron job)
export const scheduleDailyUpdates = action({
  args: {},
  handler: async (ctx) => {
    await ctx.runAction(api.emailNotifications.sendDailyUpdates, {});
  },
});

// Send test email to user
export const sendTestEmail = action({
  args: {
    userId: v.id("users"),
    emailType: v.union(
      v.literal("assignment"),
      v.literal("event"),
      v.literal("daily")
    ),
  },
  handler: async (ctx, args) => {
    // Use runQuery to access the database from an action
    const user = await ctx.runQuery(api.users.getUserById, { userId: args.userId });
    
    if (!user) {
      throw new Error("User not found");
    }

    try {
      let subject, htmlBody;

      switch (args.emailType) {
        case "assignment":
          subject = "Test Assignment Reminder - Northstar";
          htmlBody = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Test Assignment Reminder</title>
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                  line-height: 1.6; 
                  color: #333; 
                  margin: 0; 
                  padding: 0; 
                  background-color: #ffffff;
                }
                .container { 
                  max-width: 600px; 
                  margin: 40px auto; 
                  background: white; 
                  padding: 0;
                }
                .header { 
                  background: #ffffff; 
                  color: #333; 
                  padding: 40px 40px 20px 40px; 
                  text-align: left; 
                }
                .header h1 { 
                  margin: 0; 
                  font-size: 24px; 
                  font-weight: 600; 
                  color: #333;
                }
                .test-badge { 
                  background: #f59e0b; 
                  color: white; 
                  padding: 4px 8px; 
                  border-radius: 4px; 
                  font-size: 12px; 
                  font-weight: 600;
                  text-align: center;
                  border: none;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  transition: all 0.2s ease; 
                  margin-left: 12px; 
                  display: inline-block;
                }
                .content { 
                  padding: 0 40px 40px 40px; 
                }
                .assignment-title { 
                  font-size: 24px; 
                  font-weight: 600; 
                  color: #333; 
                  margin: 0 0 20px 0; 
                }
                .intro-text { 
                  color: #666; 
                  margin-bottom: 30px; 
                  font-size: 16px; 
                }
                .info-box { 
                  background: #f8f9fa; 
                  border-radius: 8px; 
                  padding: 20px; 
                  margin: 30px 0; 
                }
                .info-row { 
                  margin-bottom: 12px; 
                  font-size: 14px; 
                }
                .info-row:last-child { 
                  margin-bottom: 0; 
                }
                .info-label { 
                  font-weight: 600;
                  text-align: center;
                  border: none;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  transition: all 0.2s ease; 
                  color: #666; 
                }
                .info-value { 
                  color: #333; 
                  font-weight: 600;
                  text-align: center;
                  border: none;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  transition: all 0.2s ease; 
                }
                .cta-text { 
                  color: #666; 
                  margin: 30px 0 20px 0; 
                  font-size: 14px; 
                }
                .button { 
                  display: inline-block; 
                  background: #8B5CF6; 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 8px; 
                  font-weight: 600;
                  text-align: center;
                  border: none;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  transition: all 0.2s ease; 
                  font-size: 14px; 
                }
                .button:hover { 
                  background: #7C3AED; 
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
                  transform: translateY(-1px);
                }
                .footer { 
                  text-align: center; 
                  margin-top: 40px; 
                  padding-top: 20px; 
                  border-top: 1px solid #e5e7eb; 
                  color: #9ca3af; 
                  font-size: 12px; 
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>New assignment due soon<span class="test-badge">TEST EMAIL</span></h1>
                </div>
                <div class="content">
                  <h2 class="assignment-title">Sample Assignment: Research Paper</h2>
                  <p class="intro-text">A new assignment just appeared in your Northstar account. If you don't recognize this assignment, please check your account for any unauthorized activity.</p>
                  
                  <div class="info-box">
                    <div class="info-row">
                      <span class="info-label">Course:</span> <span class="info-value">Advanced Computer Science</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Due Date:</span> <span class="info-value">Tomorrow at 11:59 PM</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Instructor:</span> <span class="info-value">Dr. Smith</span>
                    </div>
                  </div>
                  
                  <p class="cta-text">To immediately view this assignment click the button below.</p>
                  <a href="https://ns-web.vercel.app/app/v2/dashboard" class="button">Go to Dashboard</a>
                  
                  <div class="footer">
                    <p>This is an automated notification from Northstar.</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `;
          break;

        case "event":
          subject = "Test Event Reminder - Northstar";
          htmlBody = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Test Event Reminder</title>
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                  line-height: 1.6; 
                  color: #333; 
                  margin: 0; 
                  padding: 0; 
                  background-color: #ffffff;
                }
                .container { 
                  max-width: 600px; 
                  margin: 40px auto; 
                  background: white; 
                  padding: 0;
                }
                .header { 
                  background: #ffffff; 
                  color: #333; 
                  padding: 40px 40px 20px 40px; 
                  text-align: left; 
                }
                .header h1 { 
                  margin: 0; 
                  font-size: 24px; 
                  font-weight: 600; 
                  color: #333;
                }
                .test-badge { 
                  background: #f59e0b; 
                  color: white; 
                  padding: 4px 8px; 
                  border-radius: 4px; 
                  font-size: 12px; 
                  font-weight: 600;
                  text-align: center;
                  border: none;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  transition: all 0.2s ease; 
                  margin-left: 12px; 
                  display: inline-block;
                }
                .content { 
                  padding: 0 40px 40px 40px; 
                }
                .event-title { 
                  font-size: 24px; 
                  font-weight: 600; 
                  color: #333; 
                  margin: 0 0 20px 0; 
                }
                .intro-text { 
                  color: #666; 
                  margin-bottom: 30px; 
                  font-size: 16px; 
                }
                .info-box { 
                  background: #f8f9fa; 
                  border-radius: 8px; 
                  padding: 20px; 
                  margin: 30px 0; 
                }
                .info-row { 
                  margin-bottom: 12px; 
                  font-size: 14px; 
                }
                .info-row:last-child { 
                  margin-bottom: 0; 
                }
                .info-label { 
                  font-weight: 600;
                  text-align: center;
                  border: none;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  transition: all 0.2s ease; 
                  color: #666; 
                }
                .info-value { 
                  color: #333; 
                  font-weight: 600;
                  text-align: center;
                  border: none;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  transition: all 0.2s ease; 
                }
                .cta-text { 
                  color: #666; 
                  margin: 30px 0 20px 0; 
                  font-size: 14px; 
                }
                .button { 
                  display: inline-block; 
                  background: #10B981; 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 8px; 
                  font-weight: 600;
                  text-align: center;
                  border: none;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  transition: all 0.2s ease; 
                  font-size: 14px; 
                }
                .button:hover { 
                  background: #7C3AED; 
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
                  transform: translateY(-1px);
                }
                .footer { 
                  text-align: center; 
                  margin-top: 40px; 
                  padding-top: 20px; 
                  border-top: 1px solid #e5e7eb; 
                  color: #9ca3af; 
                  font-size: 12px; 
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>New event scheduled<span class="test-badge">TEST EMAIL</span></h1>
                </div>
                <div class="content">
                  <h2 class="event-title">Sample Event: Final Exam</h2>
                  <p class="intro-text">A new event just appeared in your Northstar account. If you don't recognize this event, please check your account for any unauthorized activity.</p>
                  
                  <div class="info-box">
                    <div class="info-row">
                      <span class="info-label">Date:</span> <span class="info-value">Tomorrow</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Time:</span> <span class="info-value">2:00 PM - 4:00 PM</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Location:</span> <span class="info-value">Room 101, Science Building</span>
                    </div>
                  </div>
                  
                  <p class="cta-text">To immediately view this event click the button below.</p>
                  <a href="https://ns-web.vercel.app/app/v2/calendar" class="button">View Calendar</a>
                  
                  <div class="footer">
                    <p>This is an automated notification from Northstar.</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `;
          break;

        case "daily":
          subject = "Test Daily Update - Northstar";
          htmlBody = `
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <title>Test Daily Update</title>
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
                  line-height: 1.6; 
                  color: #333; 
                  margin: 0; 
                  padding: 0; 
                  background-color: #ffffff;
                }
                .container { 
                  max-width: 600px; 
                  margin: 40px auto; 
                  background: white; 
                  padding: 0;
                }
                .header { 
                  background: #ffffff; 
                  color: #333; 
                  padding: 40px 40px 20px 40px; 
                  text-align: left; 
                }
                .header h1 { 
                  margin: 0; 
                  font-size: 24px; 
                  font-weight: 600; 
                  color: #333;
                }
                .test-badge { 
                  background: #f59e0b; 
                  color: white; 
                  padding: 4px 8px; 
                  border-radius: 4px; 
                  font-size: 12px; 
                  font-weight: 600;
                  text-align: center;
                  border: none;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  transition: all 0.2s ease; 
                  margin-left: 12px; 
                  display: inline-block;
                }
                .content { 
                  padding: 0 40px 40px 40px; 
                }
                .intro-text { 
                  color: #666; 
                  margin-bottom: 30px; 
                  font-size: 16px; 
                }
                .summary-box { 
                  background: #f8f9fa; 
                  border-radius: 8px; 
                  padding: 20px; 
                  margin: 30px 0; 
                }
                .summary-title { 
                  font-size: 18px; 
                  font-weight: 600; 
                  color: #333; 
                  margin: 0 0 16px 0; 
                }
                .summary-row { 
                  margin-bottom: 12px; 
                  font-size: 14px; 
                }
                .summary-row:last-child { 
                  margin-bottom: 0; 
                }
                .summary-label { 
                  font-weight: 600;
                  text-align: center;
                  border: none;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  transition: all 0.2s ease; 
                  color: #666; 
                }
                .summary-value { 
                  color: #333; 
                  font-weight: 600;
                  text-align: center;
                  border: none;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  transition: all 0.2s ease; 
                }
                .section-title { 
                  font-size: 16px; 
                  font-weight: 600; 
                  color: #333; 
                  margin: 24px 0 12px 0; 
                }
                .list { 
                  margin: 0 0 16px 0; 
                  padding-left: 0; 
                  list-style: none; 
                }
                .list-item { 
                  background: #f8f9fa; 
                  padding: 12px 16px; 
                  margin-bottom: 8px; 
                  border-radius: 8px; 
                  font-size: 14px; 
                }
                .list-item:last-child { 
                  margin-bottom: 0; 
                }
                .item-title { 
                  font-weight: 600; 
                  color: #333; 
                }
                .item-details { 
                  color: #666; 
                  font-size: 13px; 
                  margin-top: 2px; 
                }
                .cta-text { 
                  color: #666; 
                  margin: 30px 0 20px 0; 
                  font-size: 14px; 
                }
                .button { 
                  display: inline-block; 
                  background: #3B82F6; 
                  color: white; 
                  padding: 12px 24px; 
                  text-decoration: none; 
                  border-radius: 8px; 
                  font-weight: 600;
                  text-align: center;
                  border: none;
                  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                  transition: all 0.2s ease; 
                  font-size: 14px; 
                }
                .button:hover { 
                  background: #2563EB; 
                  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15);
                  transform: translateY(-1px);
                }
                .footer { 
                  text-align: center; 
                  margin-top: 40px; 
                  padding-top: 20px; 
                  border-top: 1px solid #e5e7eb; 
                  color: #9ca3af; 
                  font-size: 12px; 
                }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <h1>Daily summary available<span class="test-badge">TEST EMAIL</span></h1>
                </div>
                <div class="content">
                  <p class="intro-text">Your daily Northstar summary is ready. Here's what you need to know for today.</p>
                  
                  <div class="summary-box">
                    <h3 class="summary-title">Today's Summary</h3>
                    <div class="summary-row">
                      <span class="summary-label">Assignments Due:</span> <span class="summary-value">2</span>
                    </div>
                    <div class="summary-row">
                      <span class="summary-label">Events Today:</span> <span class="summary-value">1</span>
                    </div>
                  </div>
                  
                  <h3 class="section-title">Upcoming Assignments</h3>
                  <ul class="list">
                    <li class="list-item">
                      <div class="item-title">Advanced Computer Science - Research Paper</div>
                      <div class="item-details">Due: Tomorrow</div>
                    </li>
                    <li class="list-item">
                      <div class="item-title">Introduction to Biology - Lab Report</div>
                      <div class="item-details">Due: Friday</div>
                    </li>
                  </ul>
                  
                  <h3 class="section-title">Upcoming Events</h3>
                  <ul class="list">
                    <li class="list-item">
                      <div class="item-title">Final Exam</div>
                      <div class="item-details">Tomorrow at 2:00 PM</div>
                    </li>
                  </ul>
                  
                  <p class="cta-text">To view your full dashboard and manage your schedule, click the button below.</p>
                  <a href="https://ns-web.vercel.app/app/v2/dashboard" class="button">Go to Dashboard</a>
                  
                  <div class="footer">
                    <p>This is an automated notification from Northstar.</p>
                  </div>
                </div>
              </div>
            </body>
            </html>
          `;
          break;
      }

      // For testing mode, always send to the verified email address
      // In production with a verified domain, this can be user.email
      const recipientEmail = 'cameron.mccullough@siu.edu';
      
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Northstar <onboarding@resend.dev>',
          to: [recipientEmail],
          subject,
          html: htmlBody,
        }),
      });

      if (response.ok) {
        console.log('Test email sent successfully to:', user.clerkUserId);
        return { success: true, message: 'Test email sent successfully to cameron.mccullough@siu.edu!' };
      } else {
        console.error('Failed to send test email:', await response.text());
        return { success: false, message: 'Failed to send test email' };
      }
    } catch (error) {
      console.error('Error sending test email:', error);
      return { success: false, message: 'Error sending test email' };
    }
  },
});