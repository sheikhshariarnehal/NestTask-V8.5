import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const TELEGRAM_BOT_TOKEN = "7112452317:AAEJ-M2dAS1hEPgs4Gb5GbEz-cD8ilfHQIQ";
const TELEGRAM_CHAT_ID = "-1001759460874";

// Target: CSE Department + Batch 63 + Section G
const TARGET_DEPARTMENT_ID = "82cc95f6-a4c2-474d-8c6a-1272fc0dd19e";
const TARGET_BATCH_ID = "a11b2ad5-2137-471b-b859-6f6ba611e52d";
const TARGET_SECTION_ID = "86556e98-4f4d-4541-b0a9-77091114086b";

interface TaskPayload {
  type: "INSERT" | "UPDATE" | "DELETE";
  table: string;
  record: {
    id: string;
    name: string;
    category: string;
    due_date: string;
    description: string;
    status: string;
    priority: string;
    section_id: string;
    department_id: string;
    batch_id: string;
    created_at: string;
    tags?: string[];
    google_drive_links?: string[];
  };
  schema: string;
  old_record: null | Record<string, unknown>;
}

async function sendTelegramMessage(message: string): Promise<boolean> {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "HTML",
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error("Telegram API error:", errorData);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send Telegram message:", error);
    return false;
  }
}

function formatTaskMessage(task: TaskPayload["record"]): string {
  const categoryEmoji: Record<string, string> = {
    assignment: "\ud83d\udcdd",
    exam: "\ud83d\udcda",
    project: "\ud83c\udfaf",
    lab: "\ud83d\udd2c",
    quiz: "\u2753",
    presentation: "\ud83d\udcca",
    other: "\ud83d\udccc",
  };

  const emoji = categoryEmoji[task.category?.toLowerCase()] || "\ud83d\udccb";

  let message = `\ud83d\udccc <b>${task.name}</b>\n`;
  message += `<b>\ud83d\udcc2 Category:</b> ${task.category}\n`;
  message += `<b>\ud83d\udcc5 Due Date:</b> ${task.due_date}\n`;

  if (task.description) {
    // Truncate long descriptions
    const desc = task.description.length > 200 
      ? task.description.substring(0, 200) + "..." 
      : task.description;
    message += `\n<b>\ud83d\udcdd Description:</b>\n${desc}\n`;
  }

  if (task.tags && task.tags.length > 0) {
    message += `\n<b>\ud83c\udff7\ufe0f Tags:</b> ${task.tags.map(t => `#${t}`).join(" ")}\n`;
  }

  if (task.google_drive_links && task.google_drive_links.length > 0) {
    message += `\n`;
    
    // Add clickable links for each attachment
    task.google_drive_links.forEach((link, index) => {
      // Extract a friendly name from the link or use a default
      const linkName = getLinkDisplayName(link, index + 1);
      message += `  • <a href="${link}">${linkName}</a>\n`;
    });
  }

  return message;
}

function getLinkDisplayName(link: string, index: number): string {
  try {
    // Try to determine the type of Google Drive link
    if (link.includes("/folders/")) {
      return `📁 Study Material (Folder)`;
    } else if (link.includes("/document/")) {
      return `📄 Document ${index}`;
    } else if (link.includes("/spreadsheets/")) {
      return `📊 Spreadsheet ${index}`;
    } else if (link.includes("/presentation/")) {
      return `📽️ Presentation ${index}`;
    } else if (link.includes("/file/")) {
      return `📎 File ${index}`;
    } else if (link.includes("drive.google.com")) {
      return `📎 Google Drive Link ${index}`;
    } else {
      return `🔗 Attachment ${index}`;
    }
  } catch {
    return `🔗 Attachment ${index}`;
  }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const payload: TaskPayload = await req.json();
    console.log("Received payload:", JSON.stringify(payload, null, 2));

    // Only process INSERT events
    if (payload.type !== "INSERT") {
      return new Response(
        JSON.stringify({ success: true, message: "Skipped: not an INSERT event" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const task = payload.record;

    // Check if the task belongs to the target section
    const matchesDepartment = task.department_id === TARGET_DEPARTMENT_ID;
    const matchesBatch = task.batch_id === TARGET_BATCH_ID;
    const matchesSection = task.section_id === TARGET_SECTION_ID;

    console.log("Matching criteria:", {
      matchesDepartment,
      matchesBatch,
      matchesSection,
      task_department: task.department_id,
      task_batch: task.batch_id,
      task_section: task.section_id,
    });

    // Only send notification if it matches the target section
    if (matchesSection && matchesDepartment && matchesBatch) {
      const message = formatTaskMessage(task);
      const success = await sendTelegramMessage(message);

      if (success) {
        console.log("Telegram notification sent successfully");
        return new Response(
          JSON.stringify({ success: true, message: "Notification sent to Telegram" }),
          { headers: { "Content-Type": "application/json" } }
        );
      } else {
        console.error("Failed to send Telegram notification");
        return new Response(
          JSON.stringify({ success: false, message: "Failed to send notification" }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    } else {
      console.log("Task does not match target section, skipping notification");
      return new Response(
        JSON.stringify({ success: true, message: "Skipped: task not in target section" }),
        { headers: { "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("Error processing request:", error);
    return new Response(
      JSON.stringify({ success: false, error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
