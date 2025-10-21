import { Course } from '@/data/mockCourses';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { SwipeColors } from '@/contexts/constants/Colors';

interface PDFScheduleOptions {
  title?: string;
  includeDetails?: boolean;
  colorCoded?: boolean;
  orientation?: 'portrait' | 'landscape';
}

export class PDFExportService {
  private static generateHTML(
    courses: Course[],
    semester: string,
    options: PDFScheduleOptions = {}
  ): string {
    const {
      title = '5C Course Schedule',
      includeDetails = true,
      colorCoded = true,
      orientation = 'landscape'
    } = options;

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    const timeSlots = Array.from({ length: 13 }, (_, i) => {
      const hour = i + 8; // Start at 8 AM
      return `${hour > 12 ? hour - 12 : hour}:00 ${hour >= 12 ? 'PM' : 'AM'}`;
    });

    // Group courses by day and time
    const scheduleGrid: { [day: string]: { [time: string]: Course[] } } = {};
    days.forEach(day => {
      scheduleGrid[day] = {};
      timeSlots.forEach(time => {
        scheduleGrid[day][time] = [];
      });
    });

    // Place courses in grid
    courses.forEach(course => {
      if (!course.meetingDays || !course.startTime) return;

      const dayMap: { [key: string]: string } = {
        'M': 'Monday',
        'T': 'Tuesday',
        'W': 'Wednesday',
        'Th': 'Thursday',
        'F': 'Friday'
      };

      course.meetingDays.forEach(dayCode => {
        const day = dayMap[dayCode];
        if (!day) return;

        const [hours, minutes] = course.startTime!.split(':').map(Number);
        const timeSlot = `${hours > 12 ? hours - 12 : hours}:00 ${hours >= 12 ? 'PM' : 'AM'}`;
        
        if (scheduleGrid[day][timeSlot]) {
          scheduleGrid[day][timeSlot].push(course);
        }
      });
    });

    // Generate HTML
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
            }
            .title {
              font-size: 24px;
              font-weight: bold;
              margin-bottom: 8px;
            }
            .subtitle {
              font-size: 16px;
              color: #666;
            }
            .schedule-grid {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 30px;
            }
            .schedule-grid th {
              background: #f5f5f5;
              padding: 10px;
              border: 1px solid #ddd;
              font-weight: 600;
            }
            .schedule-grid td {
              border: 1px solid #ddd;
              padding: 10px;
              vertical-align: top;
              height: 60px;
            }
            .time-column {
              width: 100px;
              background: #f9f9f9;
              font-weight: 500;
            }
            .course-block {
              padding: 8px;
              border-radius: 4px;
              margin-bottom: 4px;
              ${colorCoded ? '' : 'background: #f0f0f0;'}
            }
            .course-code {
              font-weight: 600;
              font-size: 14px;
              margin-bottom: 2px;
            }
            .course-title {
              font-size: 12px;
              margin-bottom: 2px;
            }
            .course-location {
              font-size: 11px;
              color: #666;
            }
            .course-list {
              margin-top: 30px;
              page-break-before: always;
            }
            .course-list-item {
              margin-bottom: 20px;
              padding: 15px;
              border: 1px solid #ddd;
              border-radius: 8px;
            }
            @media print {
              body {
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              @page {
                size: ${orientation};
                margin: 0.5in;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${title}</div>
            <div class="subtitle">${semester}</div>
          </div>

          <table class="schedule-grid">
            <tr>
              <th class="time-column">Time</th>
              ${days.map(day => `<th>${day}</th>`).join('')}
            </tr>
            ${timeSlots.map(time => `
              <tr>
                <td class="time-column">${time}</td>
                ${days.map(day => `
                  <td>
                    ${scheduleGrid[day][time].map(course => `
                      <div class="course-block" ${colorCoded ? `style="background: ${SwipeColors.schools[course.school]}20"` : ''}>
                        <div class="course-code">${course.courseCode}</div>
                        <div class="course-title">${course.title}</div>
                        <div class="course-location">${course.buildingCode} ${course.roomNumber}</div>
                      </div>
                    `).join('')}
                  </td>
                `).join('')}
              </tr>
            `).join('')}
          </table>

          ${includeDetails ? `
            <div class="course-list">
              <h2>Course Details</h2>
              ${courses.map(course => `
                <div class="course-list-item" ${colorCoded ? `style="border-left: 4px solid ${SwipeColors.schools[course.school]}"` : ''}>
                  <h3>${course.courseCode}: ${course.title}</h3>
                  <p><strong>Professor:</strong> ${course.professor}</p>
                  <p><strong>Schedule:</strong> ${course.meetingDays?.join('')} ${course.startTime}-${course.endTime}</p>
                  <p><strong>Location:</strong> ${course.buildingCode} ${course.roomNumber}</p>
                  <p><strong>Credits:</strong> ${course.credits}</p>
                  <p><strong>Description:</strong> ${course.description}</p>
                </div>
              `).join('')}
            </div>
          ` : ''}
        </body>
      </html>
    `;

    return html;
  }

  public static async exportScheduleToPDF(
    courses: Course[],
    semester: string,
    options: PDFScheduleOptions = {}
  ): Promise<void> {
    try {
      // Generate HTML content
      const html = this.generateHTML(courses, semester, options);

      // Save HTML to temporary file
      const tempHtmlPath = `${FileSystem.cacheDirectory}schedule.html`;
      await FileSystem.writeAsStringAsync(tempHtmlPath, html);

      // Share the HTML file (in production, you'd convert to PDF server-side)
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(tempHtmlPath, {
          mimeType: 'text/html',
          UTI: 'public.html',
          dialogTitle: 'Export Schedule as PDF',
        });
      } else {
        throw new Error('Sharing not available on this device');
      }

      // Clean up temp file
      await FileSystem.deleteAsync(tempHtmlPath, { idempotent: true });
    } catch (error) {
      console.error('PDF export error:', error);
      throw error;
    }
  }
}
