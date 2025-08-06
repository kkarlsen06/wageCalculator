
import {createRequire as ___nfyCreateRequire} from "module";
import {fileURLToPath as ___nfyFileURLToPath} from "url";
import {dirname as ___nfyPathDirname} from "path";
let __filename=___nfyFileURLToPath(import.meta.url);
let __dirname=___nfyPathDirname(___nfyFileURLToPath(import.meta.url));
let require=___nfyCreateRequire(import.meta.url);


// netlify/functions/chat.js
import "dotenv/config";
import { OpenAI } from "openai";
import { createClient } from "@supabase/supabase-js";
var openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
var supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
async function authenticateUser(headers) {
  if (process.env.DEV_BYPASS && process.env.NODE_ENV !== "production") {
    return process.env.DEV_USER_ID;
  }
  const auth = headers.authorization || "";
  if (!auth.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }
  const token = auth.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) throw new Error("Invalid or expired token");
  return user.id;
}
var addShiftSchema = {
  name: "addShift",
  description: "Add one work shift",
  parameters: {
    type: "object",
    properties: {
      shift_date: { type: "string", description: "YYYY-MM-DD" },
      start_time: { type: "string", description: "HH:mm" },
      end_time: { type: "string", description: "HH:mm" }
    },
    required: ["shift_date", "start_time", "end_time"]
  }
};
var addSeriesSchema = {
  name: "addSeries",
  description: "Add multiple identical shifts over a date range",
  parameters: {
    type: "object",
    properties: {
      from: { type: "string", description: "First day YYYY-MM-DD" },
      to: { type: "string", description: "Last day YYYY-MM-DD (inclusive)" },
      days: { type: "array", items: { type: "integer" }, description: "Weekdays 0-6" },
      start: { type: "string", description: "Shift start HH:mm" },
      end: { type: "string", description: "Shift end   HH:mm" },
      interval_weeks: { type: "integer", description: "Interval in weeks (1=every week, 2=every other week, etc.)", default: 1 },
      offset_start: { type: "integer", description: "Week offset from start date (0=no offset)", default: 0 }
    },
    required: ["from", "to", "days", "start", "end"]
  }
};
var editShiftSchema = {
  name: "editShift",
  description: "Edit an existing work shift by ID or by date+time",
  parameters: {
    type: "object",
    properties: {
      shift_id: { type: "integer", description: "ID of shift to edit (optional if shift_date+start_time provided)" },
      shift_date: { type: "string", description: "Date of shift to find/edit YYYY-MM-DD" },
      start_time: { type: "string", description: "Start time of shift to find HH:mm" },
      new_start_time: { type: "string", description: "New start time HH:mm (optional)" },
      new_end_time: { type: "string", description: "New end time HH:mm (optional)" },
      end_time: { type: "string", description: "New end time HH:mm (optional, legacy)" }
    },
    required: []
  }
};
var deleteShiftSchema = {
  name: "deleteShift",
  description: "Delete a single work shift by ID",
  parameters: {
    type: "object",
    properties: {
      shift_id: { type: "integer", description: "ID of shift to delete" }
    },
    required: ["shift_id"]
  }
};
var deleteSeriesSchema = {
  name: "deleteSeries",
  description: "Delete multiple shifts by week number and year, or automatically delete next week if no parameters provided",
  parameters: {
    type: "object",
    properties: {
      week_number: { type: "integer", description: "Week number (1-53, optional - if not provided, deletes next week)" },
      year: { type: "integer", description: "Year (optional - if not provided, uses current year or next year for next week)" }
    },
    required: []
  }
};
var getShiftsSchema = {
  name: "getShifts",
  description: "Get shifts for a specific time period",
  parameters: {
    type: "object",
    properties: {
      period: { type: "string", enum: ["today", "tomorrow", "this_week", "next_week", "this_month", "next_month"], description: "Time period to get shifts for" },
      specific_date: { type: "string", description: "Specific date YYYY-MM-DD (optional, overrides period)" },
      date_from: { type: "string", description: "Start date YYYY-MM-DD for custom range (optional)" },
      date_to: { type: "string", description: "End date YYYY-MM-DD for custom range (optional)" }
    },
    required: []
  }
};
var tools = [
  { type: "function", function: addShiftSchema },
  { type: "function", function: addSeriesSchema },
  { type: "function", function: editShiftSchema },
  { type: "function", function: deleteShiftSchema },
  { type: "function", function: deleteSeriesSchema },
  { type: "function", function: getShiftsSchema }
];
function generateSeriesDates(from, to, days, intervalWeeks = 1, offsetStart = 0) {
  const start = /* @__PURE__ */ new Date(`${from}T00:00:00Z`);
  const end = /* @__PURE__ */ new Date(`${to}T00:00:00Z`);
  const out = [];
  const referenceDate = new Date(start);
  referenceDate.setUTCDate(referenceDate.getUTCDate() + offsetStart * 7);
  const referenceMonday = new Date(referenceDate);
  const dayOfWeek = referenceDate.getUTCDay();
  const daysToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  referenceMonday.setUTCDate(referenceDate.getUTCDate() - daysToMonday);
  for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    if (days.includes(d.getUTCDay())) {
      const daysDiff = Math.floor((d.getTime() - referenceMonday.getTime()) / (24 * 60 * 60 * 1e3));
      const weekNumber = Math.floor(daysDiff / 7);
      if (weekNumber >= 0 && weekNumber % intervalWeeks === 0) {
        out.push(new Date(d));
      }
    }
  }
  return out;
}
function hoursBetween(start, end) {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return (eh * 60 + em - (sh * 60 + sm)) / 60;
}
function getNextWeeksDateRange(numWeeks = 1) {
  const today = /* @__PURE__ */ new Date();
  const currentDay = today.getDay();
  const startOfCurrentWeek = new Date(today);
  const daysToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  startOfCurrentWeek.setDate(today.getDate() + daysToMonday);
  const startOfNextWeek = new Date(startOfCurrentWeek);
  startOfNextWeek.setDate(startOfCurrentWeek.getDate() + 7);
  const endOfPeriod = new Date(startOfNextWeek);
  endOfPeriod.setDate(startOfNextWeek.getDate() + numWeeks * 7 - 1);
  return {
    start: startOfNextWeek.toISOString().slice(0, 10),
    end: endOfPeriod.toISOString().slice(0, 10)
  };
}
function getWeekNumber(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 864e5 + 1) / 7);
}
function getDateRangeForWeek(weekNumber, year) {
  const jan4 = new Date(year, 0, 4);
  const dayOfWeek = jan4.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mondayWeek1 = new Date(jan4);
  mondayWeek1.setDate(jan4.getDate() + daysToMonday);
  const targetMonday = new Date(mondayWeek1);
  targetMonday.setDate(mondayWeek1.getDate() + (weekNumber - 1) * 7);
  const targetSunday = new Date(targetMonday);
  targetSunday.setDate(targetMonday.getDate() + 6);
  return {
    start: targetMonday.toISOString().slice(0, 10),
    end: targetSunday.toISOString().slice(0, 10)
  };
}
async function handleTool(call, user_id) {
  const fnName = call.function.name;
  const args = JSON.parse(call.function.arguments);
  let toolResult = "";
  if (fnName === "addShift") {
    const { data: dupCheck } = await supabase.from("user_shifts").select("id").eq("user_id", user_id).eq("shift_date", args.shift_date).eq("start_time", args.start_time).eq("end_time", args.end_time).maybeSingle();
    if (dupCheck) {
      toolResult = JSON.stringify({
        status: "duplicate",
        inserted: [],
        updated: [],
        deleted: [],
        shift_summary: "Skiftet eksisterer allerede"
      });
    } else {
      const { data: insertedShift, error } = await supabase.from("user_shifts").insert({
        user_id,
        shift_date: args.shift_date,
        start_time: args.start_time,
        end_time: args.end_time,
        shift_type: 0
      }).select("id, shift_date, start_time, end_time").single();
      if (error) {
        toolResult = JSON.stringify({
          status: "error",
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: "Kunne ikke lagre skiftet"
        });
      } else {
        const hours = hoursBetween(args.start_time, args.end_time);
        toolResult = JSON.stringify({
          status: "success",
          inserted: [insertedShift],
          updated: [],
          deleted: [],
          shift_summary: `Skift lagret: ${args.shift_date} ${args.start_time}-${args.end_time} (${hours} timer)`
        });
      }
    }
  }
  if (fnName === "addSeries") {
    const dates = generateSeriesDates(args.from, args.to, args.days, args.interval_weeks, args.offset_start);
    if (!dates.length) {
      toolResult = JSON.stringify({
        status: "error",
        inserted: [],
        updated: [],
        deleted: [],
        shift_summary: "Ingen matchende datoer funnet"
      });
    } else {
      const rows = dates.map((d) => ({
        user_id,
        shift_date: d.toISOString().slice(0, 10),
        start_time: args.start,
        end_time: args.end,
        shift_type: 0
      }));
      const { data: existingShifts } = await supabase.from("user_shifts").select("shift_date, start_time, end_time").eq("user_id", user_id);
      const existingKeys = new Set(
        existingShifts?.map((s) => `${s.shift_date}|${s.start_time}|${s.end_time}`) || []
      );
      const newRows = rows.filter(
        (row) => !existingKeys.has(`${row.shift_date}|${row.start_time}|${row.end_time}`)
      );
      if (newRows.length === 0) {
        toolResult = JSON.stringify({
          status: "duplicate",
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: "Alle skift eksisterer allerede"
        });
      } else {
        const { data: insertedShifts, error } = await supabase.from("user_shifts").insert(newRows).select("id, shift_date, start_time, end_time");
        if (error) {
          toolResult = JSON.stringify({
            status: "error",
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: "Kunne ikke lagre skiftserien"
          });
        } else {
          const totalHours = hoursBetween(args.start, args.end) * newRows.length;
          const skippedCount = rows.length - newRows.length;
          const summary = skippedCount > 0 ? `${newRows.length} nye skift lagret (${totalHours} timer), ${skippedCount} duplikater hoppet over` : `${newRows.length} skift lagret (${totalHours} timer)`;
          toolResult = JSON.stringify({
            status: "success",
            inserted: insertedShifts || [],
            updated: [],
            deleted: [],
            shift_summary: summary
          });
        }
      }
    }
  }
  if (fnName === "editShift") {
    let shiftId = args.shift_id;
    if (!shiftId && args.shift_date && args.start_time) {
      const { data: foundShift } = await supabase.from("user_shifts").select("id").eq("user_id", user_id).eq("shift_date", args.shift_date).eq("start_time", args.start_time).maybeSingle();
      if (foundShift) {
        shiftId = foundShift.id;
      }
    }
    if (!shiftId) {
      toolResult = JSON.stringify({
        status: "error",
        inserted: [],
        updated: [],
        deleted: [],
        shift_summary: "Skiftet ble ikke funnet"
      });
    } else {
      const { data: existingShift } = await supabase.from("user_shifts").select("*").eq("id", shiftId).eq("user_id", user_id).maybeSingle();
      if (!existingShift) {
        toolResult = JSON.stringify({
          status: "error",
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: "Skiftet ble ikke funnet eller tilh\xF8rer ikke deg"
        });
      } else {
        const updateData = {};
        if (args.new_start_time) updateData.start_time = args.new_start_time;
        if (args.new_end_time) updateData.end_time = args.new_end_time;
        if (args.end_time) updateData.end_time = args.end_time;
        if (Object.keys(updateData).length > 0) {
          const checkDate = updateData.shift_date || existingShift.shift_date;
          const checkStart = updateData.start_time || existingShift.start_time;
          const checkEnd = updateData.end_time || existingShift.end_time;
          const { data: collision } = await supabase.from("user_shifts").select("id").eq("user_id", user_id).eq("shift_date", checkDate).eq("start_time", checkStart).eq("end_time", checkEnd).neq("id", shiftId).maybeSingle();
          if (collision) {
            toolResult = JSON.stringify({
              status: "duplicate",
              inserted: [],
              updated: [],
              deleted: [],
              shift_summary: "Et skift med samme tid eksisterer allerede"
            });
          } else {
            const { data: updatedShift, error } = await supabase.from("user_shifts").update(updateData).eq("id", shiftId).eq("user_id", user_id).select("id, shift_date, start_time, end_time").single();
            if (error) {
              toolResult = JSON.stringify({
                status: "error",
                inserted: [],
                updated: [],
                deleted: [],
                shift_summary: "Kunne ikke oppdatere skiftet"
              });
            } else {
              const hours = hoursBetween(updatedShift.start_time, updatedShift.end_time);
              toolResult = JSON.stringify({
                status: "success",
                inserted: [],
                updated: [updatedShift],
                deleted: [],
                shift_summary: `Skift oppdatert: ${updatedShift.shift_date} ${updatedShift.start_time}-${updatedShift.end_time} (${hours} timer)`
              });
            }
          }
        } else {
          toolResult = JSON.stringify({
            status: "error",
            inserted: [],
            updated: [],
            deleted: [],
            shift_summary: "Ingen endringer spesifisert"
          });
        }
      }
    }
  }
  if (fnName === "deleteShift") {
    const { data: existingShift } = await supabase.from("user_shifts").select("*").eq("id", args.shift_id).eq("user_id", user_id).maybeSingle();
    if (!existingShift) {
      toolResult = JSON.stringify({
        status: "error",
        inserted: [],
        updated: [],
        deleted: [],
        shift_summary: "Skiftet ble ikke funnet eller tilh\xF8rer ikke deg"
      });
    } else {
      const { error } = await supabase.from("user_shifts").delete().eq("id", args.shift_id).eq("user_id", user_id);
      if (error) {
        toolResult = JSON.stringify({
          status: "error",
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: "Kunne ikke slette skiftet"
        });
      } else {
        const hours = hoursBetween(existingShift.start_time, existingShift.end_time);
        toolResult = JSON.stringify({
          status: "success",
          inserted: [],
          updated: [],
          deleted: [existingShift],
          shift_summary: `Skift slettet: ${existingShift.shift_date} ${existingShift.start_time}-${existingShift.end_time} (${hours} timer)`
        });
      }
    }
  }
  if (fnName === "deleteSeries") {
    let weekNumber = args.week_number;
    let year = args.year;
    if (!weekNumber && !year) {
      const nextWeek = getNextWeeksDateRange(1);
      const nextWeekStart = new Date(nextWeek.start);
      weekNumber = getWeekNumber(nextWeekStart);
      year = nextWeekStart.getFullYear();
    } else if (!year) {
      year = (/* @__PURE__ */ new Date()).getFullYear();
    }
    const { start, end } = getDateRangeForWeek(weekNumber, year);
    const { data: shiftsToDelete } = await supabase.from("user_shifts").select("*").eq("user_id", user_id).gte("shift_date", start).lte("shift_date", end);
    if (!shiftsToDelete || shiftsToDelete.length === 0) {
      toolResult = JSON.stringify({
        status: "none",
        inserted: [],
        updated: [],
        deleted: [],
        shift_summary: `Ingen skift funnet for uke ${weekNumber}, ${year}`
      });
    } else {
      const { error } = await supabase.from("user_shifts").delete().eq("user_id", user_id).gte("shift_date", start).lte("shift_date", end);
      if (error) {
        toolResult = JSON.stringify({
          status: "error",
          inserted: [],
          updated: [],
          deleted: [],
          shift_summary: "Kunne ikke slette skiftene"
        });
      } else {
        const totalHours = shiftsToDelete.reduce((sum, shift) => {
          return sum + hoursBetween(shift.start_time, shift.end_time);
        }, 0);
        toolResult = JSON.stringify({
          status: "success",
          inserted: [],
          updated: [],
          deleted: shiftsToDelete,
          shift_summary: `${shiftsToDelete.length} skift slettet for uke ${weekNumber}, ${year} (${totalHours} timer)`
        });
      }
    }
  }
  if (fnName === "getShifts") {
    let selectQuery;
    let criteriaDescription = "";
    if (args.specific_date) {
      selectQuery = supabase.from("user_shifts").select("*").eq("user_id", user_id).eq("shift_date", args.specific_date).order("shift_date");
      criteriaDescription = `dato ${args.specific_date}`;
    } else if (args.date_from && args.date_to) {
      selectQuery = supabase.from("user_shifts").select("*").eq("user_id", user_id).gte("shift_date", args.date_from).lte("shift_date", args.date_to).order("shift_date");
      criteriaDescription = `periode ${args.date_from} til ${args.date_to}`;
    } else if (args.period) {
      const today = /* @__PURE__ */ new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      let startDate, endDate;
      switch (args.period) {
        case "today":
          startDate = endDate = today.toISOString().slice(0, 10);
          criteriaDescription = "i dag";
          break;
        case "tomorrow":
          startDate = endDate = tomorrow.toISOString().slice(0, 10);
          criteriaDescription = "i morgen";
          break;
        case "this_week":
          const thisWeekStart = new Date(today);
          const dayOfWeek = today.getDay();
          const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
          thisWeekStart.setDate(today.getDate() + daysToMonday);
          const thisWeekEnd = new Date(thisWeekStart);
          thisWeekEnd.setDate(thisWeekStart.getDate() + 6);
          startDate = thisWeekStart.toISOString().slice(0, 10);
          endDate = thisWeekEnd.toISOString().slice(0, 10);
          criteriaDescription = "denne uken";
          break;
        case "next_week":
          const nextWeekRange = getNextWeeksDateRange(1);
          startDate = nextWeekRange.start;
          endDate = nextWeekRange.end;
          criteriaDescription = "neste uke";
          break;
        case "this_month":
          const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
          const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
          startDate = thisMonthStart.toISOString().slice(0, 10);
          endDate = thisMonthEnd.toISOString().slice(0, 10);
          criteriaDescription = "denne m\xE5neden";
          break;
        case "next_month":
          const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
          const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
          startDate = nextMonthStart.toISOString().slice(0, 10);
          endDate = nextMonthEnd.toISOString().slice(0, 10);
          criteriaDescription = "neste m\xE5ned";
          break;
        default:
          toolResult = "ERROR: Ugyldig periode spesifisert";
      }
      if (startDate && endDate) {
        selectQuery = supabase.from("user_shifts").select("*").eq("user_id", user_id).gte("shift_date", startDate).lte("shift_date", endDate).order("shift_date");
      }
    } else {
      toolResult = "ERROR: Ingen s\xF8kekriterier spesifisert";
    }
    if (!toolResult.startsWith("ERROR:")) {
      const { data: shifts, error } = await selectQuery;
      if (error) {
        toolResult = "ERROR: Kunne ikke hente skift";
      } else if (!shifts || shifts.length === 0) {
        toolResult = `NONE: Ingen skift funnet for ${criteriaDescription}`;
      } else {
        const totalHours = shifts.reduce((sum, shift) => {
          return sum + hoursBetween(shift.start_time, shift.end_time);
        }, 0);
        const formattedShifts = shifts.map(
          (shift) => `${shift.shift_date} ${shift.start_time}-${shift.end_time}`
        ).join(", ");
        toolResult = `OK: ${shifts.length} skift funnet for ${criteriaDescription} (${totalHours} timer totalt). Skift: ${formattedShifts}`;
      }
    }
  }
  return toolResult;
}
var chat_default = async (req, context) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
  try {
    const { messages } = await req.json();
    const user_id = await authenticateUser(req.headers);
    const { data: { user }, error: userError } = await supabase.auth.getUser(req.headers.authorization?.slice(7));
    let userName = "bruker";
    if (!userError && user) {
      userName = user.user_metadata?.first_name || user.email?.split("@")[0] || "bruker";
    }
    const today = (/* @__PURE__ */ new Date()).toLocaleDateString("no-NO", { timeZone: "Europe/Oslo" });
    const tomorrow = new Date(Date.now() + 864e5).toLocaleDateString("no-NO", { timeZone: "Europe/Oslo" });
    const systemContextHint = {
      role: "system",
      content: `Brukerens navn er ${userName}, s\xE5 du kan bruke navnet i svarene dine for \xE5 gj\xF8re dem mer personlige. I dag er ${today}, i morgen er ${tomorrow}. Svar alltid p\xE5 norsk.`
    };
    const fullMessages = [systemContextHint, ...messages];
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: fullMessages,
      tools,
      tool_choice: "auto"
    });
    const choice = completion.choices[0].message;
    if (choice.tool_calls && choice.tool_calls.length > 0) {
      const toolMessages = [];
      for (const call of choice.tool_calls) {
        const toolResult = await handleTool(call, user_id);
        toolMessages.push({
          role: "tool",
          tool_call_id: call.id,
          name: call.function.name,
          content: toolResult
        });
      }
      const messagesWithToolResult = [
        ...fullMessages,
        {
          role: "assistant",
          content: choice.content,
          tool_calls: choice.tool_calls
        },
        ...toolMessages
      ];
      let assistantMessage;
      try {
        const secondCompletion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: messagesWithToolResult,
          tools,
          tool_choice: "none"
        });
        assistantMessage = secondCompletion.choices[0].message.content;
      } catch (error) {
        console.error("Second GPT call failed:", error);
        const hasSuccess = toolMessages.some((msg) => msg.content.startsWith("OK:"));
        const hasError = toolMessages.some((msg) => msg.content.startsWith("ERROR:"));
        if (hasError) {
          assistantMessage = "Det oppstod en feil med en av operasjonene. Pr\xF8v igjen.";
        } else if (hasSuccess) {
          assistantMessage = "Operasjonene er utf\xF8rt! \u{1F44D}";
        } else {
          assistantMessage = "Operasjonene er utf\xF8rt.";
        }
      }
      const { data: shifts } = await supabase.from("user_shifts").select("*").eq("user_id", user_id).order("shift_date");
      return new Response(JSON.stringify({
        assistant: assistantMessage,
        shifts: shifts || []
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    } else {
      const assistantMessage = choice.content || "Jeg forstod ikke kommandoen.";
      const { data: shifts } = await supabase.from("user_shifts").select("*").eq("user_id", user_id).order("shift_date");
      return new Response(JSON.stringify({
        assistant: assistantMessage,
        shifts: shifts || []
      }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
  } catch (error) {
    console.error("Chat function error:", error);
    if (error.message.includes("Authorization") || error.message.includes("token")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      });
    }
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
};
export {
  chat_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsibmV0bGlmeS9mdW5jdGlvbnMvY2hhdC5qcyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiLy8gPT09PT0gTmV0bGlmeSBGdW5jdGlvbjogY2hhdC5qcyA9PT09PVxuaW1wb3J0ICdkb3RlbnYvY29uZmlnJztcbmltcG9ydCB7IE9wZW5BSSB9IGZyb20gJ29wZW5haSc7XG5pbXBvcnQgeyBjcmVhdGVDbGllbnQgfSBmcm9tICdAc3VwYWJhc2Uvc3VwYWJhc2UtanMnO1xuXG4vLyAtLS0tLS0tLS0tIHRoaXJkLXBhcnR5IGNsaWVudHMgLS0tLS0tLS0tLVxuY29uc3Qgb3BlbmFpID0gbmV3IE9wZW5BSSh7IGFwaUtleTogcHJvY2Vzcy5lbnYuT1BFTkFJX0FQSV9LRVkgfSk7XG5jb25zdCBzdXBhYmFzZSA9IGNyZWF0ZUNsaWVudChcbiAgcHJvY2Vzcy5lbnYuU1VQQUJBU0VfVVJMLFxuICBwcm9jZXNzLmVudi5TVVBBQkFTRV9TRVJWSUNFX1JPTEVfS0VZXG4pO1xuXG4vLyAtLS0tLS0tLS0tIGF1dGggaGVscGVyIC0tLS0tLS0tLS1cbmFzeW5jIGZ1bmN0aW9uIGF1dGhlbnRpY2F0ZVVzZXIoaGVhZGVycykge1xuICAvLyBEZXYtbW9kZSBmYWxsYmFjayBmb3IgbG9jYWwgZGV2ZWxvcG1lbnRcbiAgaWYgKHByb2Nlc3MuZW52LkRFVl9CWVBBU1MgJiYgcHJvY2Vzcy5lbnYuTk9ERV9FTlYgIT09ICdwcm9kdWN0aW9uJykge1xuICAgIHJldHVybiBwcm9jZXNzLmVudi5ERVZfVVNFUl9JRDsgIC8vIHNldHQgdGlsIGRpbiBVVUlEIGkgLmVudlxuICB9XG5cbiAgY29uc3QgYXV0aCA9IGhlYWRlcnMuYXV0aG9yaXphdGlvbiB8fCAnJztcbiAgaWYgKCFhdXRoLnN0YXJ0c1dpdGgoJ0JlYXJlciAnKSkge1xuICAgIHRocm93IG5ldyBFcnJvcignTWlzc2luZyBvciBpbnZhbGlkIEF1dGhvcml6YXRpb24gaGVhZGVyJyk7XG4gIH1cbiAgY29uc3QgdG9rZW4gPSBhdXRoLnNsaWNlKDcpO1xuXG4gIGNvbnN0IHsgZGF0YTogeyB1c2VyIH0sIGVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZS5hdXRoLmdldFVzZXIodG9rZW4pO1xuICBpZiAoZXJyb3IgfHwgIXVzZXIpIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBvciBleHBpcmVkIHRva2VuJyk7XG5cbiAgcmV0dXJuIHVzZXIuaWQ7XG59XG5cbi8vIC0tLS0tLS0tLS0gR1BUIHRvb2wgc2NoZW1hcyAtLS0tLS0tLS0tXG5jb25zdCBhZGRTaGlmdFNjaGVtYSA9IHtcbiAgbmFtZTogJ2FkZFNoaWZ0JyxcbiAgZGVzY3JpcHRpb246ICdBZGQgb25lIHdvcmsgc2hpZnQnLFxuICBwYXJhbWV0ZXJzOiB7XG4gICAgdHlwZTogJ29iamVjdCcsXG4gICAgcHJvcGVydGllczoge1xuICAgICAgc2hpZnRfZGF0ZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdZWVlZLU1NLUREJyB9LFxuICAgICAgc3RhcnRfdGltZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdISDptbScgfSxcbiAgICAgIGVuZF90aW1lOiAgIHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnSEg6bW0nIH1cbiAgICB9LFxuICAgIHJlcXVpcmVkOiBbJ3NoaWZ0X2RhdGUnLCAnc3RhcnRfdGltZScsICdlbmRfdGltZSddXG4gIH1cbn07XG5cbmNvbnN0IGFkZFNlcmllc1NjaGVtYSA9IHtcbiAgbmFtZTogJ2FkZFNlcmllcycsXG4gIGRlc2NyaXB0aW9uOiAnQWRkIG11bHRpcGxlIGlkZW50aWNhbCBzaGlmdHMgb3ZlciBhIGRhdGUgcmFuZ2UnLFxuICBwYXJhbWV0ZXJzOiB7XG4gICAgdHlwZTogJ29iamVjdCcsXG4gICAgcHJvcGVydGllczoge1xuICAgICAgZnJvbTogIHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnRmlyc3QgZGF5IFlZWVktTU0tREQnIH0sXG4gICAgICB0bzogICAgeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdMYXN0IGRheSBZWVlZLU1NLUREIChpbmNsdXNpdmUpJyB9LFxuICAgICAgZGF5czogIHsgdHlwZTogJ2FycmF5JywgIGl0ZW1zOiB7IHR5cGU6ICdpbnRlZ2VyJyB9LCBkZXNjcmlwdGlvbjogJ1dlZWtkYXlzIDAtNicgfSxcbiAgICAgIHN0YXJ0OiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1NoaWZ0IHN0YXJ0IEhIOm1tJyB9LFxuICAgICAgZW5kOiAgIHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnU2hpZnQgZW5kICAgSEg6bW0nIH0sXG4gICAgICBpbnRlcnZhbF93ZWVrczogeyB0eXBlOiAnaW50ZWdlcicsIGRlc2NyaXB0aW9uOiAnSW50ZXJ2YWwgaW4gd2Vla3MgKDE9ZXZlcnkgd2VlaywgMj1ldmVyeSBvdGhlciB3ZWVrLCBldGMuKScsIGRlZmF1bHQ6IDEgfSxcbiAgICAgIG9mZnNldF9zdGFydDogeyB0eXBlOiAnaW50ZWdlcicsIGRlc2NyaXB0aW9uOiAnV2VlayBvZmZzZXQgZnJvbSBzdGFydCBkYXRlICgwPW5vIG9mZnNldCknLCBkZWZhdWx0OiAwIH1cbiAgICB9LFxuICAgIHJlcXVpcmVkOiBbJ2Zyb20nLCAndG8nLCAnZGF5cycsICdzdGFydCcsICdlbmQnXVxuICB9XG59O1xuXG5jb25zdCBlZGl0U2hpZnRTY2hlbWEgPSB7XG4gIG5hbWU6ICdlZGl0U2hpZnQnLFxuICBkZXNjcmlwdGlvbjogJ0VkaXQgYW4gZXhpc3Rpbmcgd29yayBzaGlmdCBieSBJRCBvciBieSBkYXRlK3RpbWUnLFxuICBwYXJhbWV0ZXJzOiB7XG4gICAgdHlwZTogJ29iamVjdCcsXG4gICAgcHJvcGVydGllczoge1xuICAgICAgc2hpZnRfaWQ6IHsgdHlwZTogJ2ludGVnZXInLCBkZXNjcmlwdGlvbjogJ0lEIG9mIHNoaWZ0IHRvIGVkaXQgKG9wdGlvbmFsIGlmIHNoaWZ0X2RhdGUrc3RhcnRfdGltZSBwcm92aWRlZCknIH0sXG4gICAgICBzaGlmdF9kYXRlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0RhdGUgb2Ygc2hpZnQgdG8gZmluZC9lZGl0IFlZWVktTU0tREQnIH0sXG4gICAgICBzdGFydF90aW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1N0YXJ0IHRpbWUgb2Ygc2hpZnQgdG8gZmluZCBISDptbScgfSxcbiAgICAgIG5ld19zdGFydF90aW1lOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ05ldyBzdGFydCB0aW1lIEhIOm1tIChvcHRpb25hbCknIH0sXG4gICAgICBuZXdfZW5kX3RpbWU6IHsgdHlwZTogJ3N0cmluZycsIGRlc2NyaXB0aW9uOiAnTmV3IGVuZCB0aW1lIEhIOm1tIChvcHRpb25hbCknIH0sXG4gICAgICBlbmRfdGltZTogeyB0eXBlOiAnc3RyaW5nJywgZGVzY3JpcHRpb246ICdOZXcgZW5kIHRpbWUgSEg6bW0gKG9wdGlvbmFsLCBsZWdhY3kpJyB9XG4gICAgfSxcbiAgICByZXF1aXJlZDogW11cbiAgfVxufTtcblxuY29uc3QgZGVsZXRlU2hpZnRTY2hlbWEgPSB7XG4gIG5hbWU6ICdkZWxldGVTaGlmdCcsXG4gIGRlc2NyaXB0aW9uOiAnRGVsZXRlIGEgc2luZ2xlIHdvcmsgc2hpZnQgYnkgSUQnLFxuICBwYXJhbWV0ZXJzOiB7XG4gICAgdHlwZTogJ29iamVjdCcsXG4gICAgcHJvcGVydGllczoge1xuICAgICAgc2hpZnRfaWQ6IHsgdHlwZTogJ2ludGVnZXInLCBkZXNjcmlwdGlvbjogJ0lEIG9mIHNoaWZ0IHRvIGRlbGV0ZScgfVxuICAgIH0sXG4gICAgcmVxdWlyZWQ6IFsnc2hpZnRfaWQnXVxuICB9XG59O1xuXG5jb25zdCBkZWxldGVTZXJpZXNTY2hlbWEgPSB7XG4gIG5hbWU6ICdkZWxldGVTZXJpZXMnLFxuICBkZXNjcmlwdGlvbjogJ0RlbGV0ZSBtdWx0aXBsZSBzaGlmdHMgYnkgd2VlayBudW1iZXIgYW5kIHllYXIsIG9yIGF1dG9tYXRpY2FsbHkgZGVsZXRlIG5leHQgd2VlayBpZiBubyBwYXJhbWV0ZXJzIHByb3ZpZGVkJyxcbiAgcGFyYW1ldGVyczoge1xuICAgIHR5cGU6ICdvYmplY3QnLFxuICAgIHByb3BlcnRpZXM6IHtcbiAgICAgIHdlZWtfbnVtYmVyOiB7IHR5cGU6ICdpbnRlZ2VyJywgZGVzY3JpcHRpb246ICdXZWVrIG51bWJlciAoMS01Mywgb3B0aW9uYWwgLSBpZiBub3QgcHJvdmlkZWQsIGRlbGV0ZXMgbmV4dCB3ZWVrKScgfSxcbiAgICAgIHllYXI6IHsgdHlwZTogJ2ludGVnZXInLCBkZXNjcmlwdGlvbjogJ1llYXIgKG9wdGlvbmFsIC0gaWYgbm90IHByb3ZpZGVkLCB1c2VzIGN1cnJlbnQgeWVhciBvciBuZXh0IHllYXIgZm9yIG5leHQgd2VlayknIH1cbiAgICB9LFxuICAgIHJlcXVpcmVkOiBbXVxuICB9XG59O1xuXG5jb25zdCBnZXRTaGlmdHNTY2hlbWEgPSB7XG4gIG5hbWU6ICdnZXRTaGlmdHMnLFxuICBkZXNjcmlwdGlvbjogJ0dldCBzaGlmdHMgZm9yIGEgc3BlY2lmaWMgdGltZSBwZXJpb2QnLFxuICBwYXJhbWV0ZXJzOiB7XG4gICAgdHlwZTogJ29iamVjdCcsXG4gICAgcHJvcGVydGllczoge1xuICAgICAgcGVyaW9kOiB7IHR5cGU6ICdzdHJpbmcnLCBlbnVtOiBbJ3RvZGF5JywgJ3RvbW9ycm93JywgJ3RoaXNfd2VlaycsICduZXh0X3dlZWsnLCAndGhpc19tb250aCcsICduZXh0X21vbnRoJ10sIGRlc2NyaXB0aW9uOiAnVGltZSBwZXJpb2QgdG8gZ2V0IHNoaWZ0cyBmb3InIH0sXG4gICAgICBzcGVjaWZpY19kYXRlOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1NwZWNpZmljIGRhdGUgWVlZWS1NTS1ERCAob3B0aW9uYWwsIG92ZXJyaWRlcyBwZXJpb2QpJyB9LFxuICAgICAgZGF0ZV9mcm9tOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ1N0YXJ0IGRhdGUgWVlZWS1NTS1ERCBmb3IgY3VzdG9tIHJhbmdlIChvcHRpb25hbCknIH0sXG4gICAgICBkYXRlX3RvOiB7IHR5cGU6ICdzdHJpbmcnLCBkZXNjcmlwdGlvbjogJ0VuZCBkYXRlIFlZWVktTU0tREQgZm9yIGN1c3RvbSByYW5nZSAob3B0aW9uYWwpJyB9XG4gICAgfSxcbiAgICByZXF1aXJlZDogW11cbiAgfVxufTtcblxuY29uc3QgdG9vbHMgPSBbXG4gIHsgdHlwZTogJ2Z1bmN0aW9uJywgZnVuY3Rpb246IGFkZFNoaWZ0U2NoZW1hIH0sXG4gIHsgdHlwZTogJ2Z1bmN0aW9uJywgZnVuY3Rpb246IGFkZFNlcmllc1NjaGVtYSB9LFxuICB7IHR5cGU6ICdmdW5jdGlvbicsIGZ1bmN0aW9uOiBlZGl0U2hpZnRTY2hlbWEgfSxcbiAgeyB0eXBlOiAnZnVuY3Rpb24nLCBmdW5jdGlvbjogZGVsZXRlU2hpZnRTY2hlbWEgfSxcbiAgeyB0eXBlOiAnZnVuY3Rpb24nLCBmdW5jdGlvbjogZGVsZXRlU2VyaWVzU2NoZW1hIH0sXG4gIHsgdHlwZTogJ2Z1bmN0aW9uJywgZnVuY3Rpb246IGdldFNoaWZ0c1NjaGVtYSB9XG5dO1xuXG4vLyAtLS0tLS0tLS0tIGhlbHBlciBmdW5jdGlvbnMgLS0tLS0tLS0tLVxuZnVuY3Rpb24gZ2VuZXJhdGVTZXJpZXNEYXRlcyhmcm9tLCB0bywgZGF5cywgaW50ZXJ2YWxXZWVrcyA9IDEsIG9mZnNldFN0YXJ0ID0gMCkge1xuICBjb25zdCBzdGFydCA9IG5ldyBEYXRlKGAke2Zyb219VDAwOjAwOjAwWmApO1xuICBjb25zdCBlbmQgICA9IG5ldyBEYXRlKGAke3RvfVQwMDowMDowMFpgKTtcbiAgY29uc3Qgb3V0ICAgPSBbXTtcblxuICAvLyBDYWxjdWxhdGUgdGhlIHJlZmVyZW5jZSB3ZWVrICh3ZWVrIDApIGJhc2VkIG9uIHN0YXJ0IGRhdGUgYW5kIG9mZnNldFxuICBjb25zdCByZWZlcmVuY2VEYXRlID0gbmV3IERhdGUoc3RhcnQpO1xuICByZWZlcmVuY2VEYXRlLnNldFVUQ0RhdGUocmVmZXJlbmNlRGF0ZS5nZXRVVENEYXRlKCkgKyAob2Zmc2V0U3RhcnQgKiA3KSk7XG5cbiAgLy8gR2V0IHRoZSBNb25kYXkgb2YgdGhlIHJlZmVyZW5jZSB3ZWVrXG4gIGNvbnN0IHJlZmVyZW5jZU1vbmRheSA9IG5ldyBEYXRlKHJlZmVyZW5jZURhdGUpO1xuICBjb25zdCBkYXlPZldlZWsgPSByZWZlcmVuY2VEYXRlLmdldFVUQ0RheSgpO1xuICBjb25zdCBkYXlzVG9Nb25kYXkgPSBkYXlPZldlZWsgPT09IDAgPyA2IDogZGF5T2ZXZWVrIC0gMTsgLy8gU3VuZGF5ID0gMCwgc28gNiBkYXlzIGJhY2sgdG8gTW9uZGF5XG4gIHJlZmVyZW5jZU1vbmRheS5zZXRVVENEYXRlKHJlZmVyZW5jZURhdGUuZ2V0VVRDRGF0ZSgpIC0gZGF5c1RvTW9uZGF5KTtcblxuICBmb3IgKGxldCBkID0gbmV3IERhdGUoc3RhcnQpOyBkIDw9IGVuZDsgZC5zZXRVVENEYXRlKGQuZ2V0VVRDRGF0ZSgpICsgMSkpIHtcbiAgICBpZiAoZGF5cy5pbmNsdWRlcyhkLmdldFVUQ0RheSgpKSkge1xuICAgICAgLy8gQ2FsY3VsYXRlIHdoaWNoIHdlZWsgdGhpcyBkYXRlIGlzIGluIHJlbGF0aXZlIHRvIHJlZmVyZW5jZSBNb25kYXlcbiAgICAgIGNvbnN0IGRheXNEaWZmID0gTWF0aC5mbG9vcigoZC5nZXRUaW1lKCkgLSByZWZlcmVuY2VNb25kYXkuZ2V0VGltZSgpKSAvICgyNCAqIDYwICogNjAgKiAxMDAwKSk7XG4gICAgICBjb25zdCB3ZWVrTnVtYmVyID0gTWF0aC5mbG9vcihkYXlzRGlmZiAvIDcpO1xuXG4gICAgICAvLyBPbmx5IGluY2x1ZGUgaWYgdGhpcyB3ZWVrIG1hdGNoZXMgdGhlIGludGVydmFsIHBhdHRlcm5cbiAgICAgIGlmICh3ZWVrTnVtYmVyID49IDAgJiYgd2Vla051bWJlciAlIGludGVydmFsV2Vla3MgPT09IDApIHtcbiAgICAgICAgb3V0LnB1c2gobmV3IERhdGUoZCkpO1xuICAgICAgfVxuICAgIH1cbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG5mdW5jdGlvbiBob3Vyc0JldHdlZW4oc3RhcnQsIGVuZCkge1xuICBjb25zdCBbc2gsIHNtXSA9IHN0YXJ0LnNwbGl0KCc6JykubWFwKE51bWJlcik7XG4gIGNvbnN0IFtlaCwgZW1dID0gZW5kLnNwbGl0KCc6JykubWFwKE51bWJlcik7XG4gIHJldHVybiAoKGVoICogNjAgKyBlbSkgLSAoc2ggKiA2MCArIHNtKSkgLyA2MDtcbn1cblxuZnVuY3Rpb24gZ2V0TmV4dFdlZWtzRGF0ZVJhbmdlKG51bVdlZWtzID0gMSkge1xuICBjb25zdCB0b2RheSA9IG5ldyBEYXRlKCk7XG4gIGNvbnN0IGN1cnJlbnREYXkgPSB0b2RheS5nZXREYXkoKTtcblxuICAvLyBGaW5kIHN0YXJ0IG9mIGN1cnJlbnQgd2VlayAoTW9uZGF5KVxuICBjb25zdCBzdGFydE9mQ3VycmVudFdlZWsgPSBuZXcgRGF0ZSh0b2RheSk7XG4gIGNvbnN0IGRheXNUb01vbmRheSA9IGN1cnJlbnREYXkgPT09IDAgPyAtNiA6IDEgLSBjdXJyZW50RGF5O1xuICBzdGFydE9mQ3VycmVudFdlZWsuc2V0RGF0ZSh0b2RheS5nZXREYXRlKCkgKyBkYXlzVG9Nb25kYXkpO1xuXG4gIC8vIFN0YXJ0IG9mIG5leHQgd2Vla1xuICBjb25zdCBzdGFydE9mTmV4dFdlZWsgPSBuZXcgRGF0ZShzdGFydE9mQ3VycmVudFdlZWspO1xuICBzdGFydE9mTmV4dFdlZWsuc2V0RGF0ZShzdGFydE9mQ3VycmVudFdlZWsuZ2V0RGF0ZSgpICsgNyk7XG5cbiAgLy8gRW5kIG9mIHRoZSBwZXJpb2QgKGVuZCBvZiB0aGUgbGFzdCByZXF1ZXN0ZWQgd2VlaylcbiAgY29uc3QgZW5kT2ZQZXJpb2QgPSBuZXcgRGF0ZShzdGFydE9mTmV4dFdlZWspO1xuICBlbmRPZlBlcmlvZC5zZXREYXRlKHN0YXJ0T2ZOZXh0V2Vlay5nZXREYXRlKCkgKyAobnVtV2Vla3MgKiA3KSAtIDEpO1xuXG4gIHJldHVybiB7XG4gICAgc3RhcnQ6IHN0YXJ0T2ZOZXh0V2Vlay50b0lTT1N0cmluZygpLnNsaWNlKDAsIDEwKSxcbiAgICBlbmQ6IGVuZE9mUGVyaW9kLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTApXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldFdlZWtOdW1iZXIoZGF0ZSkge1xuICBjb25zdCBkID0gbmV3IERhdGUoRGF0ZS5VVEMoZGF0ZS5nZXRGdWxsWWVhcigpLCBkYXRlLmdldE1vbnRoKCksIGRhdGUuZ2V0RGF0ZSgpKSk7XG4gIGNvbnN0IGRheU51bSA9IGQuZ2V0VVRDRGF5KCkgfHwgNztcbiAgZC5zZXRVVENEYXRlKGQuZ2V0VVRDRGF0ZSgpICsgNCAtIGRheU51bSk7XG4gIGNvbnN0IHllYXJTdGFydCA9IG5ldyBEYXRlKERhdGUuVVRDKGQuZ2V0VVRDRnVsbFllYXIoKSwgMCwgMSkpO1xuICByZXR1cm4gTWF0aC5jZWlsKCgoKGQgLSB5ZWFyU3RhcnQpIC8gODY0MDAwMDApICsgMSkgLyA3KTtcbn1cblxuZnVuY3Rpb24gZ2V0RGF0ZVJhbmdlRm9yV2Vlayh3ZWVrTnVtYmVyLCB5ZWFyKSB7XG4gIC8vIENyZWF0ZSBKYW51YXJ5IDR0aCBvZiB0aGUgZ2l2ZW4geWVhciAoYWx3YXlzIGluIHdlZWsgMSlcbiAgY29uc3QgamFuNCA9IG5ldyBEYXRlKHllYXIsIDAsIDQpO1xuXG4gIC8vIEZpbmQgdGhlIE1vbmRheSBvZiB3ZWVrIDFcbiAgY29uc3QgZGF5T2ZXZWVrID0gamFuNC5nZXREYXkoKTtcbiAgY29uc3QgZGF5c1RvTW9uZGF5ID0gZGF5T2ZXZWVrID09PSAwID8gLTYgOiAxIC0gZGF5T2ZXZWVrO1xuICBjb25zdCBtb25kYXlXZWVrMSA9IG5ldyBEYXRlKGphbjQpO1xuICBtb25kYXlXZWVrMS5zZXREYXRlKGphbjQuZ2V0RGF0ZSgpICsgZGF5c1RvTW9uZGF5KTtcblxuICAvLyBDYWxjdWxhdGUgdGhlIE1vbmRheSBvZiB0aGUgdGFyZ2V0IHdlZWtcbiAgY29uc3QgdGFyZ2V0TW9uZGF5ID0gbmV3IERhdGUobW9uZGF5V2VlazEpO1xuICB0YXJnZXRNb25kYXkuc2V0RGF0ZShtb25kYXlXZWVrMS5nZXREYXRlKCkgKyAod2Vla051bWJlciAtIDEpICogNyk7XG5cbiAgLy8gQ2FsY3VsYXRlIHRoZSBTdW5kYXkgb2YgdGhlIHRhcmdldCB3ZWVrXG4gIGNvbnN0IHRhcmdldFN1bmRheSA9IG5ldyBEYXRlKHRhcmdldE1vbmRheSk7XG4gIHRhcmdldFN1bmRheS5zZXREYXRlKHRhcmdldE1vbmRheS5nZXREYXRlKCkgKyA2KTtcblxuICByZXR1cm4ge1xuICAgIHN0YXJ0OiB0YXJnZXRNb25kYXkudG9JU09TdHJpbmcoKS5zbGljZSgwLCAxMCksXG4gICAgZW5kOiB0YXJnZXRTdW5kYXkudG9JU09TdHJpbmcoKS5zbGljZSgwLCAxMClcbiAgfTtcbn1cblxuLy8gLS0tLS0tLS0tLSBoYW5kbGVUb29sIGZ1bmN0aW9uIC0tLS0tLS0tLS1cbmFzeW5jIGZ1bmN0aW9uIGhhbmRsZVRvb2woY2FsbCwgdXNlcl9pZCkge1xuICBjb25zdCBmbk5hbWUgPSBjYWxsLmZ1bmN0aW9uLm5hbWU7XG4gIGNvbnN0IGFyZ3MgPSBKU09OLnBhcnNlKGNhbGwuZnVuY3Rpb24uYXJndW1lbnRzKTtcbiAgbGV0IHRvb2xSZXN1bHQgPSAnJztcblxuICBpZiAoZm5OYW1lID09PSAnYWRkU2hpZnQnKSB7XG4gICAgICAvLyBDaGVjayBmb3IgZHVwbGljYXRlIHNoaWZ0IGJlZm9yZSBpbnNlcnRpbmdcbiAgICAgIGNvbnN0IHsgZGF0YTogZHVwQ2hlY2sgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAgIC5mcm9tKCd1c2VyX3NoaWZ0cycpXG4gICAgICAgIC5zZWxlY3QoJ2lkJylcbiAgICAgICAgLmVxKCd1c2VyX2lkJywgdXNlcl9pZClcbiAgICAgICAgLmVxKCdzaGlmdF9kYXRlJywgYXJncy5zaGlmdF9kYXRlKVxuICAgICAgICAuZXEoJ3N0YXJ0X3RpbWUnLCBhcmdzLnN0YXJ0X3RpbWUpXG4gICAgICAgIC5lcSgnZW5kX3RpbWUnLCBhcmdzLmVuZF90aW1lKVxuICAgICAgICAubWF5YmVTaW5nbGUoKTtcblxuICAgICAgaWYgKGR1cENoZWNrKSB7XG4gICAgICAgIHRvb2xSZXN1bHQgPSBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgc3RhdHVzOiAnZHVwbGljYXRlJyxcbiAgICAgICAgICBpbnNlcnRlZDogW10sXG4gICAgICAgICAgdXBkYXRlZDogW10sXG4gICAgICAgICAgZGVsZXRlZDogW10sXG4gICAgICAgICAgc2hpZnRfc3VtbWFyeTogJ1NraWZ0ZXQgZWtzaXN0ZXJlciBhbGxlcmVkZSdcbiAgICAgICAgfSk7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICBjb25zdCB7IGRhdGE6IGluc2VydGVkU2hpZnQsIGVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZVxuICAgICAgICAgIC5mcm9tKCd1c2VyX3NoaWZ0cycpXG4gICAgICAgICAgLmluc2VydCh7XG4gICAgICAgICAgICB1c2VyX2lkOiAgICAgdXNlcl9pZCxcbiAgICAgICAgICAgIHNoaWZ0X2RhdGU6ICBhcmdzLnNoaWZ0X2RhdGUsXG4gICAgICAgICAgICBzdGFydF90aW1lOiAgYXJncy5zdGFydF90aW1lLFxuICAgICAgICAgICAgZW5kX3RpbWU6ICAgIGFyZ3MuZW5kX3RpbWUsXG4gICAgICAgICAgICBzaGlmdF90eXBlOiAgMFxuICAgICAgICAgIH0pXG4gICAgICAgICAgLnNlbGVjdCgnaWQsIHNoaWZ0X2RhdGUsIHN0YXJ0X3RpbWUsIGVuZF90aW1lJylcbiAgICAgICAgICAuc2luZ2xlKCk7XG5cbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgdG9vbFJlc3VsdCA9IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgIHN0YXR1czogJ2Vycm9yJyxcbiAgICAgICAgICAgIGluc2VydGVkOiBbXSxcbiAgICAgICAgICAgIHVwZGF0ZWQ6IFtdLFxuICAgICAgICAgICAgZGVsZXRlZDogW10sXG4gICAgICAgICAgICBzaGlmdF9zdW1tYXJ5OiAnS3VubmUgaWtrZSBsYWdyZSBza2lmdGV0J1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGNvbnN0IGhvdXJzID0gaG91cnNCZXR3ZWVuKGFyZ3Muc3RhcnRfdGltZSwgYXJncy5lbmRfdGltZSk7XG4gICAgICAgICAgdG9vbFJlc3VsdCA9IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgIHN0YXR1czogJ3N1Y2Nlc3MnLFxuICAgICAgICAgICAgaW5zZXJ0ZWQ6IFtpbnNlcnRlZFNoaWZ0XSxcbiAgICAgICAgICAgIHVwZGF0ZWQ6IFtdLFxuICAgICAgICAgICAgZGVsZXRlZDogW10sXG4gICAgICAgICAgICBzaGlmdF9zdW1tYXJ5OiBgU2tpZnQgbGFncmV0OiAke2FyZ3Muc2hpZnRfZGF0ZX0gJHthcmdzLnN0YXJ0X3RpbWV9LSR7YXJncy5lbmRfdGltZX0gKCR7aG91cnN9IHRpbWVyKWBcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChmbk5hbWUgPT09ICdhZGRTZXJpZXMnKSB7XG4gICAgICBjb25zdCBkYXRlcyA9IGdlbmVyYXRlU2VyaWVzRGF0ZXMoYXJncy5mcm9tLCBhcmdzLnRvLCBhcmdzLmRheXMsIGFyZ3MuaW50ZXJ2YWxfd2Vla3MsIGFyZ3Mub2Zmc2V0X3N0YXJ0KTtcbiAgICAgIGlmICghZGF0ZXMubGVuZ3RoKSB7XG4gICAgICAgIHRvb2xSZXN1bHQgPSBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgc3RhdHVzOiAnZXJyb3InLFxuICAgICAgICAgIGluc2VydGVkOiBbXSxcbiAgICAgICAgICB1cGRhdGVkOiBbXSxcbiAgICAgICAgICBkZWxldGVkOiBbXSxcbiAgICAgICAgICBzaGlmdF9zdW1tYXJ5OiAnSW5nZW4gbWF0Y2hlbmRlIGRhdG9lciBmdW5uZXQnXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgY29uc3Qgcm93cyA9IGRhdGVzLm1hcChkID0+ICh7XG4gICAgICAgICAgdXNlcl9pZDogICAgdXNlcl9pZCxcbiAgICAgICAgICBzaGlmdF9kYXRlOiBkLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTApLFxuICAgICAgICAgIHN0YXJ0X3RpbWU6IGFyZ3Muc3RhcnQsXG4gICAgICAgICAgZW5kX3RpbWU6ICAgYXJncy5lbmQsXG4gICAgICAgICAgc2hpZnRfdHlwZTogMFxuICAgICAgICB9KSk7XG5cbiAgICAgICAgLy8gRmlsdGVyIG91dCBkdXBsaWNhdGVzIGJlZm9yZSBpbnNlcnRpbmdcbiAgICAgICAgY29uc3QgeyBkYXRhOiBleGlzdGluZ1NoaWZ0cyB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgICAgICAuZnJvbSgndXNlcl9zaGlmdHMnKVxuICAgICAgICAgIC5zZWxlY3QoJ3NoaWZ0X2RhdGUsIHN0YXJ0X3RpbWUsIGVuZF90aW1lJylcbiAgICAgICAgICAuZXEoJ3VzZXJfaWQnLCB1c2VyX2lkKTtcblxuICAgICAgICBjb25zdCBleGlzdGluZ0tleXMgPSBuZXcgU2V0KFxuICAgICAgICAgIGV4aXN0aW5nU2hpZnRzPy5tYXAocyA9PiBgJHtzLnNoaWZ0X2RhdGV9fCR7cy5zdGFydF90aW1lfXwke3MuZW5kX3RpbWV9YCkgfHwgW11cbiAgICAgICAgKTtcblxuICAgICAgICBjb25zdCBuZXdSb3dzID0gcm93cy5maWx0ZXIocm93ID0+XG4gICAgICAgICAgIWV4aXN0aW5nS2V5cy5oYXMoYCR7cm93LnNoaWZ0X2RhdGV9fCR7cm93LnN0YXJ0X3RpbWV9fCR7cm93LmVuZF90aW1lfWApXG4gICAgICAgICk7XG5cbiAgICAgICAgaWYgKG5ld1Jvd3MubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgdG9vbFJlc3VsdCA9IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgIHN0YXR1czogJ2R1cGxpY2F0ZScsXG4gICAgICAgICAgICBpbnNlcnRlZDogW10sXG4gICAgICAgICAgICB1cGRhdGVkOiBbXSxcbiAgICAgICAgICAgIGRlbGV0ZWQ6IFtdLFxuICAgICAgICAgICAgc2hpZnRfc3VtbWFyeTogJ0FsbGUgc2tpZnQgZWtzaXN0ZXJlciBhbGxlcmVkZSdcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCB7IGRhdGE6IGluc2VydGVkU2hpZnRzLCBlcnJvciB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgICAgICAgIC5mcm9tKCd1c2VyX3NoaWZ0cycpXG4gICAgICAgICAgICAuaW5zZXJ0KG5ld1Jvd3MpXG4gICAgICAgICAgICAuc2VsZWN0KCdpZCwgc2hpZnRfZGF0ZSwgc3RhcnRfdGltZSwgZW5kX3RpbWUnKTtcblxuICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgdG9vbFJlc3VsdCA9IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgc3RhdHVzOiAnZXJyb3InLFxuICAgICAgICAgICAgICBpbnNlcnRlZDogW10sXG4gICAgICAgICAgICAgIHVwZGF0ZWQ6IFtdLFxuICAgICAgICAgICAgICBkZWxldGVkOiBbXSxcbiAgICAgICAgICAgICAgc2hpZnRfc3VtbWFyeTogJ0t1bm5lIGlra2UgbGFncmUgc2tpZnRzZXJpZW4nXG4gICAgICAgICAgICB9KTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc3QgdG90YWxIb3VycyA9IGhvdXJzQmV0d2VlbihhcmdzLnN0YXJ0LCBhcmdzLmVuZCkgKiBuZXdSb3dzLmxlbmd0aDtcbiAgICAgICAgICAgIGNvbnN0IHNraXBwZWRDb3VudCA9IHJvd3MubGVuZ3RoIC0gbmV3Um93cy5sZW5ndGg7XG4gICAgICAgICAgICBjb25zdCBzdW1tYXJ5ID0gc2tpcHBlZENvdW50ID4gMFxuICAgICAgICAgICAgICA/IGAke25ld1Jvd3MubGVuZ3RofSBueWUgc2tpZnQgbGFncmV0ICgke3RvdGFsSG91cnN9IHRpbWVyKSwgJHtza2lwcGVkQ291bnR9IGR1cGxpa2F0ZXIgaG9wcGV0IG92ZXJgXG4gICAgICAgICAgICAgIDogYCR7bmV3Um93cy5sZW5ndGh9IHNraWZ0IGxhZ3JldCAoJHt0b3RhbEhvdXJzfSB0aW1lcilgO1xuXG4gICAgICAgICAgICB0b29sUmVzdWx0ID0gSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICBzdGF0dXM6ICdzdWNjZXNzJyxcbiAgICAgICAgICAgICAgaW5zZXJ0ZWQ6IGluc2VydGVkU2hpZnRzIHx8IFtdLFxuICAgICAgICAgICAgICB1cGRhdGVkOiBbXSxcbiAgICAgICAgICAgICAgZGVsZXRlZDogW10sXG4gICAgICAgICAgICAgIHNoaWZ0X3N1bW1hcnk6IHN1bW1hcnlcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChmbk5hbWUgPT09ICdlZGl0U2hpZnQnKSB7XG4gICAgICBsZXQgc2hpZnRJZCA9IGFyZ3Muc2hpZnRfaWQ7XG5cbiAgICAgIC8vIElmIG5vIHNoaWZ0X2lkIHByb3ZpZGVkLCB0cnkgdG8gZmluZCBieSBkYXRlIGFuZCB0aW1lXG4gICAgICBpZiAoIXNoaWZ0SWQgJiYgYXJncy5zaGlmdF9kYXRlICYmIGFyZ3Muc3RhcnRfdGltZSkge1xuICAgICAgICBjb25zdCB7IGRhdGE6IGZvdW5kU2hpZnQgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAgICAgLmZyb20oJ3VzZXJfc2hpZnRzJylcbiAgICAgICAgICAuc2VsZWN0KCdpZCcpXG4gICAgICAgICAgLmVxKCd1c2VyX2lkJywgdXNlcl9pZClcbiAgICAgICAgICAuZXEoJ3NoaWZ0X2RhdGUnLCBhcmdzLnNoaWZ0X2RhdGUpXG4gICAgICAgICAgLmVxKCdzdGFydF90aW1lJywgYXJncy5zdGFydF90aW1lKVxuICAgICAgICAgIC5tYXliZVNpbmdsZSgpO1xuXG4gICAgICAgIGlmIChmb3VuZFNoaWZ0KSB7XG4gICAgICAgICAgc2hpZnRJZCA9IGZvdW5kU2hpZnQuaWQ7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgaWYgKCFzaGlmdElkKSB7XG4gICAgICAgIHRvb2xSZXN1bHQgPSBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgc3RhdHVzOiAnZXJyb3InLFxuICAgICAgICAgIGluc2VydGVkOiBbXSxcbiAgICAgICAgICB1cGRhdGVkOiBbXSxcbiAgICAgICAgICBkZWxldGVkOiBbXSxcbiAgICAgICAgICBzaGlmdF9zdW1tYXJ5OiAnU2tpZnRldCBibGUgaWtrZSBmdW5uZXQnXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gVmVyaWZ5IHNoaWZ0IGV4aXN0cyBhbmQgYmVsb25ncyB0byB1c2VyXG4gICAgICAgIGNvbnN0IHsgZGF0YTogZXhpc3RpbmdTaGlmdCB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgICAgICAuZnJvbSgndXNlcl9zaGlmdHMnKVxuICAgICAgICAgIC5zZWxlY3QoJyonKVxuICAgICAgICAgIC5lcSgnaWQnLCBzaGlmdElkKVxuICAgICAgICAgIC5lcSgndXNlcl9pZCcsIHVzZXJfaWQpXG4gICAgICAgICAgLm1heWJlU2luZ2xlKCk7XG5cbiAgICAgICAgaWYgKCFleGlzdGluZ1NoaWZ0KSB7XG4gICAgICAgICAgdG9vbFJlc3VsdCA9IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgIHN0YXR1czogJ2Vycm9yJyxcbiAgICAgICAgICAgIGluc2VydGVkOiBbXSxcbiAgICAgICAgICAgIHVwZGF0ZWQ6IFtdLFxuICAgICAgICAgICAgZGVsZXRlZDogW10sXG4gICAgICAgICAgICBzaGlmdF9zdW1tYXJ5OiAnU2tpZnRldCBibGUgaWtrZSBmdW5uZXQgZWxsZXIgdGlsaFx1MDBGOHJlciBpa2tlIGRlZydcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAvLyBCdWlsZCB1cGRhdGUgb2JqZWN0XG4gICAgICAgICAgY29uc3QgdXBkYXRlRGF0YSA9IHt9O1xuICAgICAgICAgIGlmIChhcmdzLm5ld19zdGFydF90aW1lKSB1cGRhdGVEYXRhLnN0YXJ0X3RpbWUgPSBhcmdzLm5ld19zdGFydF90aW1lO1xuICAgICAgICAgIGlmIChhcmdzLm5ld19lbmRfdGltZSkgdXBkYXRlRGF0YS5lbmRfdGltZSA9IGFyZ3MubmV3X2VuZF90aW1lO1xuICAgICAgICAgIGlmIChhcmdzLmVuZF90aW1lKSB1cGRhdGVEYXRhLmVuZF90aW1lID0gYXJncy5lbmRfdGltZTsgLy8gbGVnYWN5IHN1cHBvcnRcblxuICAgICAgICAgIC8vIENoZWNrIGZvciBjb2xsaXNpb24gd2l0aCBvdGhlciBzaGlmdHMgKGV4Y2x1ZGluZyBjdXJyZW50IHNoaWZ0KVxuICAgICAgICAgIGlmIChPYmplY3Qua2V5cyh1cGRhdGVEYXRhKS5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zdCBjaGVja0RhdGUgPSB1cGRhdGVEYXRhLnNoaWZ0X2RhdGUgfHwgZXhpc3RpbmdTaGlmdC5zaGlmdF9kYXRlO1xuICAgICAgICAgICAgY29uc3QgY2hlY2tTdGFydCA9IHVwZGF0ZURhdGEuc3RhcnRfdGltZSB8fCBleGlzdGluZ1NoaWZ0LnN0YXJ0X3RpbWU7XG4gICAgICAgICAgICBjb25zdCBjaGVja0VuZCA9IHVwZGF0ZURhdGEuZW5kX3RpbWUgfHwgZXhpc3RpbmdTaGlmdC5lbmRfdGltZTtcblxuICAgICAgICAgICAgY29uc3QgeyBkYXRhOiBjb2xsaXNpb24gfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAgICAgICAgIC5mcm9tKCd1c2VyX3NoaWZ0cycpXG4gICAgICAgICAgICAgIC5zZWxlY3QoJ2lkJylcbiAgICAgICAgICAgICAgLmVxKCd1c2VyX2lkJywgdXNlcl9pZClcbiAgICAgICAgICAgICAgLmVxKCdzaGlmdF9kYXRlJywgY2hlY2tEYXRlKVxuICAgICAgICAgICAgICAuZXEoJ3N0YXJ0X3RpbWUnLCBjaGVja1N0YXJ0KVxuICAgICAgICAgICAgICAuZXEoJ2VuZF90aW1lJywgY2hlY2tFbmQpXG4gICAgICAgICAgICAgIC5uZXEoJ2lkJywgc2hpZnRJZClcbiAgICAgICAgICAgICAgLm1heWJlU2luZ2xlKCk7XG5cbiAgICAgICAgICAgIGlmIChjb2xsaXNpb24pIHtcbiAgICAgICAgICAgICAgdG9vbFJlc3VsdCA9IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgICAgICBzdGF0dXM6ICdkdXBsaWNhdGUnLFxuICAgICAgICAgICAgICAgIGluc2VydGVkOiBbXSxcbiAgICAgICAgICAgICAgICB1cGRhdGVkOiBbXSxcbiAgICAgICAgICAgICAgICBkZWxldGVkOiBbXSxcbiAgICAgICAgICAgICAgICBzaGlmdF9zdW1tYXJ5OiAnRXQgc2tpZnQgbWVkIHNhbW1lIHRpZCBla3Npc3RlcmVyIGFsbGVyZWRlJ1xuICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIC8vIFBlcmZvcm0gdGhlIHVwZGF0ZVxuICAgICAgICAgICAgICBjb25zdCB7IGRhdGE6IHVwZGF0ZWRTaGlmdCwgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAgICAgICAgICAgLmZyb20oJ3VzZXJfc2hpZnRzJylcbiAgICAgICAgICAgICAgICAudXBkYXRlKHVwZGF0ZURhdGEpXG4gICAgICAgICAgICAgICAgLmVxKCdpZCcsIHNoaWZ0SWQpXG4gICAgICAgICAgICAgICAgLmVxKCd1c2VyX2lkJywgdXNlcl9pZClcbiAgICAgICAgICAgICAgICAuc2VsZWN0KCdpZCwgc2hpZnRfZGF0ZSwgc3RhcnRfdGltZSwgZW5kX3RpbWUnKVxuICAgICAgICAgICAgICAgIC5zaW5nbGUoKTtcblxuICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICB0b29sUmVzdWx0ID0gSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICAgICAgc3RhdHVzOiAnZXJyb3InLFxuICAgICAgICAgICAgICAgICAgaW5zZXJ0ZWQ6IFtdLFxuICAgICAgICAgICAgICAgICAgdXBkYXRlZDogW10sXG4gICAgICAgICAgICAgICAgICBkZWxldGVkOiBbXSxcbiAgICAgICAgICAgICAgICAgIHNoaWZ0X3N1bW1hcnk6ICdLdW5uZSBpa2tlIG9wcGRhdGVyZSBza2lmdGV0J1xuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIGNvbnN0IGhvdXJzID0gaG91cnNCZXR3ZWVuKHVwZGF0ZWRTaGlmdC5zdGFydF90aW1lLCB1cGRhdGVkU2hpZnQuZW5kX3RpbWUpO1xuICAgICAgICAgICAgICAgIHRvb2xSZXN1bHQgPSBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICAgICAgICBzdGF0dXM6ICdzdWNjZXNzJyxcbiAgICAgICAgICAgICAgICAgIGluc2VydGVkOiBbXSxcbiAgICAgICAgICAgICAgICAgIHVwZGF0ZWQ6IFt1cGRhdGVkU2hpZnRdLFxuICAgICAgICAgICAgICAgICAgZGVsZXRlZDogW10sXG4gICAgICAgICAgICAgICAgICBzaGlmdF9zdW1tYXJ5OiBgU2tpZnQgb3BwZGF0ZXJ0OiAke3VwZGF0ZWRTaGlmdC5zaGlmdF9kYXRlfSAke3VwZGF0ZWRTaGlmdC5zdGFydF90aW1lfS0ke3VwZGF0ZWRTaGlmdC5lbmRfdGltZX0gKCR7aG91cnN9IHRpbWVyKWBcbiAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICB0b29sUmVzdWx0ID0gSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgICBzdGF0dXM6ICdlcnJvcicsXG4gICAgICAgICAgICAgIGluc2VydGVkOiBbXSxcbiAgICAgICAgICAgICAgdXBkYXRlZDogW10sXG4gICAgICAgICAgICAgIGRlbGV0ZWQ6IFtdLFxuICAgICAgICAgICAgICBzaGlmdF9zdW1tYXJ5OiAnSW5nZW4gZW5kcmluZ2VyIHNwZXNpZmlzZXJ0J1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGZuTmFtZSA9PT0gJ2RlbGV0ZVNoaWZ0Jykge1xuICAgICAgLy8gVmVyaWZ5IHNoaWZ0IGV4aXN0cyBhbmQgYmVsb25ncyB0byB1c2VyXG4gICAgICBjb25zdCB7IGRhdGE6IGV4aXN0aW5nU2hpZnQgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAgIC5mcm9tKCd1c2VyX3NoaWZ0cycpXG4gICAgICAgIC5zZWxlY3QoJyonKVxuICAgICAgICAuZXEoJ2lkJywgYXJncy5zaGlmdF9pZClcbiAgICAgICAgLmVxKCd1c2VyX2lkJywgdXNlcl9pZClcbiAgICAgICAgLm1heWJlU2luZ2xlKCk7XG5cbiAgICAgIGlmICghZXhpc3RpbmdTaGlmdCkge1xuICAgICAgICB0b29sUmVzdWx0ID0gSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIHN0YXR1czogJ2Vycm9yJyxcbiAgICAgICAgICBpbnNlcnRlZDogW10sXG4gICAgICAgICAgdXBkYXRlZDogW10sXG4gICAgICAgICAgZGVsZXRlZDogW10sXG4gICAgICAgICAgc2hpZnRfc3VtbWFyeTogJ1NraWZ0ZXQgYmxlIGlra2UgZnVubmV0IGVsbGVyIHRpbGhcdTAwRjhyZXIgaWtrZSBkZWcnXG4gICAgICAgIH0pO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgLy8gRGVsZXRlIHRoZSBzaGlmdFxuICAgICAgICBjb25zdCB7IGVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZVxuICAgICAgICAgIC5mcm9tKCd1c2VyX3NoaWZ0cycpXG4gICAgICAgICAgLmRlbGV0ZSgpXG4gICAgICAgICAgLmVxKCdpZCcsIGFyZ3Muc2hpZnRfaWQpXG4gICAgICAgICAgLmVxKCd1c2VyX2lkJywgdXNlcl9pZCk7XG5cbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgdG9vbFJlc3VsdCA9IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICAgIHN0YXR1czogJ2Vycm9yJyxcbiAgICAgICAgICAgIGluc2VydGVkOiBbXSxcbiAgICAgICAgICAgIHVwZGF0ZWQ6IFtdLFxuICAgICAgICAgICAgZGVsZXRlZDogW10sXG4gICAgICAgICAgICBzaGlmdF9zdW1tYXJ5OiAnS3VubmUgaWtrZSBzbGV0dGUgc2tpZnRldCdcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCBob3VycyA9IGhvdXJzQmV0d2VlbihleGlzdGluZ1NoaWZ0LnN0YXJ0X3RpbWUsIGV4aXN0aW5nU2hpZnQuZW5kX3RpbWUpO1xuICAgICAgICAgIHRvb2xSZXN1bHQgPSBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICBzdGF0dXM6ICdzdWNjZXNzJyxcbiAgICAgICAgICAgIGluc2VydGVkOiBbXSxcbiAgICAgICAgICAgIHVwZGF0ZWQ6IFtdLFxuICAgICAgICAgICAgZGVsZXRlZDogW2V4aXN0aW5nU2hpZnRdLFxuICAgICAgICAgICAgc2hpZnRfc3VtbWFyeTogYFNraWZ0IHNsZXR0ZXQ6ICR7ZXhpc3RpbmdTaGlmdC5zaGlmdF9kYXRlfSAke2V4aXN0aW5nU2hpZnQuc3RhcnRfdGltZX0tJHtleGlzdGluZ1NoaWZ0LmVuZF90aW1lfSAoJHtob3Vyc30gdGltZXIpYFxuICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKGZuTmFtZSA9PT0gJ2RlbGV0ZVNlcmllcycpIHtcbiAgICAgIGxldCB3ZWVrTnVtYmVyID0gYXJncy53ZWVrX251bWJlcjtcbiAgICAgIGxldCB5ZWFyID0gYXJncy55ZWFyO1xuXG4gICAgICAvLyBJZiBubyBwYXJhbWV0ZXJzIHByb3ZpZGVkLCBkZWxldGUgbmV4dCB3ZWVrXG4gICAgICBpZiAoIXdlZWtOdW1iZXIgJiYgIXllYXIpIHtcbiAgICAgICAgY29uc3QgbmV4dFdlZWsgPSBnZXROZXh0V2Vla3NEYXRlUmFuZ2UoMSk7XG4gICAgICAgIGNvbnN0IG5leHRXZWVrU3RhcnQgPSBuZXcgRGF0ZShuZXh0V2Vlay5zdGFydCk7XG4gICAgICAgIHdlZWtOdW1iZXIgPSBnZXRXZWVrTnVtYmVyKG5leHRXZWVrU3RhcnQpO1xuICAgICAgICB5ZWFyID0gbmV4dFdlZWtTdGFydC5nZXRGdWxsWWVhcigpO1xuICAgICAgfSBlbHNlIGlmICgheWVhcikge1xuICAgICAgICB5ZWFyID0gbmV3IERhdGUoKS5nZXRGdWxsWWVhcigpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCB7IHN0YXJ0LCBlbmQgfSA9IGdldERhdGVSYW5nZUZvcldlZWsod2Vla051bWJlciwgeWVhcik7XG5cbiAgICAgIC8vIEdldCBzaGlmdHMgdG8gYmUgZGVsZXRlZCBmb3Igc3VtbWFyeVxuICAgICAgY29uc3QgeyBkYXRhOiBzaGlmdHNUb0RlbGV0ZSB9ID0gYXdhaXQgc3VwYWJhc2VcbiAgICAgICAgLmZyb20oJ3VzZXJfc2hpZnRzJylcbiAgICAgICAgLnNlbGVjdCgnKicpXG4gICAgICAgIC5lcSgndXNlcl9pZCcsIHVzZXJfaWQpXG4gICAgICAgIC5ndGUoJ3NoaWZ0X2RhdGUnLCBzdGFydClcbiAgICAgICAgLmx0ZSgnc2hpZnRfZGF0ZScsIGVuZCk7XG5cbiAgICAgIGlmICghc2hpZnRzVG9EZWxldGUgfHwgc2hpZnRzVG9EZWxldGUubGVuZ3RoID09PSAwKSB7XG4gICAgICAgIHRvb2xSZXN1bHQgPSBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgc3RhdHVzOiAnbm9uZScsXG4gICAgICAgICAgaW5zZXJ0ZWQ6IFtdLFxuICAgICAgICAgIHVwZGF0ZWQ6IFtdLFxuICAgICAgICAgIGRlbGV0ZWQ6IFtdLFxuICAgICAgICAgIHNoaWZ0X3N1bW1hcnk6IGBJbmdlbiBza2lmdCBmdW5uZXQgZm9yIHVrZSAke3dlZWtOdW1iZXJ9LCAke3llYXJ9YFxuICAgICAgICB9KTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIC8vIERlbGV0ZSB0aGUgc2hpZnRzXG4gICAgICAgIGNvbnN0IHsgZXJyb3IgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAgICAgLmZyb20oJ3VzZXJfc2hpZnRzJylcbiAgICAgICAgICAuZGVsZXRlKClcbiAgICAgICAgICAuZXEoJ3VzZXJfaWQnLCB1c2VyX2lkKVxuICAgICAgICAgIC5ndGUoJ3NoaWZ0X2RhdGUnLCBzdGFydClcbiAgICAgICAgICAubHRlKCdzaGlmdF9kYXRlJywgZW5kKTtcblxuICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICB0b29sUmVzdWx0ID0gSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgICAgc3RhdHVzOiAnZXJyb3InLFxuICAgICAgICAgICAgaW5zZXJ0ZWQ6IFtdLFxuICAgICAgICAgICAgdXBkYXRlZDogW10sXG4gICAgICAgICAgICBkZWxldGVkOiBbXSxcbiAgICAgICAgICAgIHNoaWZ0X3N1bW1hcnk6ICdLdW5uZSBpa2tlIHNsZXR0ZSBza2lmdGVuZSdcbiAgICAgICAgICB9KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBjb25zdCB0b3RhbEhvdXJzID0gc2hpZnRzVG9EZWxldGUucmVkdWNlKChzdW0sIHNoaWZ0KSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gc3VtICsgaG91cnNCZXR3ZWVuKHNoaWZ0LnN0YXJ0X3RpbWUsIHNoaWZ0LmVuZF90aW1lKTtcbiAgICAgICAgICB9LCAwKTtcblxuICAgICAgICAgIHRvb2xSZXN1bHQgPSBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgICBzdGF0dXM6ICdzdWNjZXNzJyxcbiAgICAgICAgICAgIGluc2VydGVkOiBbXSxcbiAgICAgICAgICAgIHVwZGF0ZWQ6IFtdLFxuICAgICAgICAgICAgZGVsZXRlZDogc2hpZnRzVG9EZWxldGUsXG4gICAgICAgICAgICBzaGlmdF9zdW1tYXJ5OiBgJHtzaGlmdHNUb0RlbGV0ZS5sZW5ndGh9IHNraWZ0IHNsZXR0ZXQgZm9yIHVrZSAke3dlZWtOdW1iZXJ9LCAke3llYXJ9ICgke3RvdGFsSG91cnN9IHRpbWVyKWBcbiAgICAgICAgICB9KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChmbk5hbWUgPT09ICdnZXRTaGlmdHMnKSB7XG4gICAgICBsZXQgc2VsZWN0UXVlcnk7XG4gICAgICBsZXQgY3JpdGVyaWFEZXNjcmlwdGlvbiA9ICcnO1xuXG4gICAgICBpZiAoYXJncy5zcGVjaWZpY19kYXRlKSB7XG4gICAgICAgIHNlbGVjdFF1ZXJ5ID0gc3VwYWJhc2VcbiAgICAgICAgICAuZnJvbSgndXNlcl9zaGlmdHMnKVxuICAgICAgICAgIC5zZWxlY3QoJyonKVxuICAgICAgICAgIC5lcSgndXNlcl9pZCcsIHVzZXJfaWQpXG4gICAgICAgICAgLmVxKCdzaGlmdF9kYXRlJywgYXJncy5zcGVjaWZpY19kYXRlKVxuICAgICAgICAgIC5vcmRlcignc2hpZnRfZGF0ZScpO1xuICAgICAgICBjcml0ZXJpYURlc2NyaXB0aW9uID0gYGRhdG8gJHthcmdzLnNwZWNpZmljX2RhdGV9YDtcbiAgICAgIH0gZWxzZSBpZiAoYXJncy5kYXRlX2Zyb20gJiYgYXJncy5kYXRlX3RvKSB7XG4gICAgICAgIHNlbGVjdFF1ZXJ5ID0gc3VwYWJhc2VcbiAgICAgICAgICAuZnJvbSgndXNlcl9zaGlmdHMnKVxuICAgICAgICAgIC5zZWxlY3QoJyonKVxuICAgICAgICAgIC5lcSgndXNlcl9pZCcsIHVzZXJfaWQpXG4gICAgICAgICAgLmd0ZSgnc2hpZnRfZGF0ZScsIGFyZ3MuZGF0ZV9mcm9tKVxuICAgICAgICAgIC5sdGUoJ3NoaWZ0X2RhdGUnLCBhcmdzLmRhdGVfdG8pXG4gICAgICAgICAgLm9yZGVyKCdzaGlmdF9kYXRlJyk7XG4gICAgICAgIGNyaXRlcmlhRGVzY3JpcHRpb24gPSBgcGVyaW9kZSAke2FyZ3MuZGF0ZV9mcm9tfSB0aWwgJHthcmdzLmRhdGVfdG99YDtcbiAgICAgIH0gZWxzZSBpZiAoYXJncy5wZXJpb2QpIHtcbiAgICAgICAgY29uc3QgdG9kYXkgPSBuZXcgRGF0ZSgpO1xuICAgICAgICBjb25zdCB0b21vcnJvdyA9IG5ldyBEYXRlKHRvZGF5KTtcbiAgICAgICAgdG9tb3Jyb3cuc2V0RGF0ZSh0b2RheS5nZXREYXRlKCkgKyAxKTtcblxuICAgICAgICBsZXQgc3RhcnREYXRlLCBlbmREYXRlO1xuXG4gICAgICAgIHN3aXRjaCAoYXJncy5wZXJpb2QpIHtcbiAgICAgICAgICBjYXNlICd0b2RheSc6XG4gICAgICAgICAgICBzdGFydERhdGUgPSBlbmREYXRlID0gdG9kYXkudG9JU09TdHJpbmcoKS5zbGljZSgwLCAxMCk7XG4gICAgICAgICAgICBjcml0ZXJpYURlc2NyaXB0aW9uID0gJ2kgZGFnJztcbiAgICAgICAgICAgIGJyZWFrO1xuICAgICAgICAgIGNhc2UgJ3RvbW9ycm93JzpcbiAgICAgICAgICAgIHN0YXJ0RGF0ZSA9IGVuZERhdGUgPSB0b21vcnJvdy50b0lTT1N0cmluZygpLnNsaWNlKDAsIDEwKTtcbiAgICAgICAgICAgIGNyaXRlcmlhRGVzY3JpcHRpb24gPSAnaSBtb3JnZW4nO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAndGhpc193ZWVrJzpcbiAgICAgICAgICAgIGNvbnN0IHRoaXNXZWVrU3RhcnQgPSBuZXcgRGF0ZSh0b2RheSk7XG4gICAgICAgICAgICBjb25zdCBkYXlPZldlZWsgPSB0b2RheS5nZXREYXkoKTtcbiAgICAgICAgICAgIGNvbnN0IGRheXNUb01vbmRheSA9IGRheU9mV2VlayA9PT0gMCA/IC02IDogMSAtIGRheU9mV2VlaztcbiAgICAgICAgICAgIHRoaXNXZWVrU3RhcnQuc2V0RGF0ZSh0b2RheS5nZXREYXRlKCkgKyBkYXlzVG9Nb25kYXkpO1xuICAgICAgICAgICAgY29uc3QgdGhpc1dlZWtFbmQgPSBuZXcgRGF0ZSh0aGlzV2Vla1N0YXJ0KTtcbiAgICAgICAgICAgIHRoaXNXZWVrRW5kLnNldERhdGUodGhpc1dlZWtTdGFydC5nZXREYXRlKCkgKyA2KTtcbiAgICAgICAgICAgIHN0YXJ0RGF0ZSA9IHRoaXNXZWVrU3RhcnQudG9JU09TdHJpbmcoKS5zbGljZSgwLCAxMCk7XG4gICAgICAgICAgICBlbmREYXRlID0gdGhpc1dlZWtFbmQudG9JU09TdHJpbmcoKS5zbGljZSgwLCAxMCk7XG4gICAgICAgICAgICBjcml0ZXJpYURlc2NyaXB0aW9uID0gJ2Rlbm5lIHVrZW4nO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnbmV4dF93ZWVrJzpcbiAgICAgICAgICAgIGNvbnN0IG5leHRXZWVrUmFuZ2UgPSBnZXROZXh0V2Vla3NEYXRlUmFuZ2UoMSk7XG4gICAgICAgICAgICBzdGFydERhdGUgPSBuZXh0V2Vla1JhbmdlLnN0YXJ0O1xuICAgICAgICAgICAgZW5kRGF0ZSA9IG5leHRXZWVrUmFuZ2UuZW5kO1xuICAgICAgICAgICAgY3JpdGVyaWFEZXNjcmlwdGlvbiA9ICduZXN0ZSB1a2UnO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAndGhpc19tb250aCc6XG4gICAgICAgICAgICBjb25zdCB0aGlzTW9udGhTdGFydCA9IG5ldyBEYXRlKHRvZGF5LmdldEZ1bGxZZWFyKCksIHRvZGF5LmdldE1vbnRoKCksIDEpO1xuICAgICAgICAgICAgY29uc3QgdGhpc01vbnRoRW5kID0gbmV3IERhdGUodG9kYXkuZ2V0RnVsbFllYXIoKSwgdG9kYXkuZ2V0TW9udGgoKSArIDEsIDApO1xuICAgICAgICAgICAgc3RhcnREYXRlID0gdGhpc01vbnRoU3RhcnQudG9JU09TdHJpbmcoKS5zbGljZSgwLCAxMCk7XG4gICAgICAgICAgICBlbmREYXRlID0gdGhpc01vbnRoRW5kLnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTApO1xuICAgICAgICAgICAgY3JpdGVyaWFEZXNjcmlwdGlvbiA9ICdkZW5uZSBtXHUwMEU1bmVkZW4nO1xuICAgICAgICAgICAgYnJlYWs7XG4gICAgICAgICAgY2FzZSAnbmV4dF9tb250aCc6XG4gICAgICAgICAgICBjb25zdCBuZXh0TW9udGhTdGFydCA9IG5ldyBEYXRlKHRvZGF5LmdldEZ1bGxZZWFyKCksIHRvZGF5LmdldE1vbnRoKCkgKyAxLCAxKTtcbiAgICAgICAgICAgIGNvbnN0IG5leHRNb250aEVuZCA9IG5ldyBEYXRlKHRvZGF5LmdldEZ1bGxZZWFyKCksIHRvZGF5LmdldE1vbnRoKCkgKyAyLCAwKTtcbiAgICAgICAgICAgIHN0YXJ0RGF0ZSA9IG5leHRNb250aFN0YXJ0LnRvSVNPU3RyaW5nKCkuc2xpY2UoMCwgMTApO1xuICAgICAgICAgICAgZW5kRGF0ZSA9IG5leHRNb250aEVuZC50b0lTT1N0cmluZygpLnNsaWNlKDAsIDEwKTtcbiAgICAgICAgICAgIGNyaXRlcmlhRGVzY3JpcHRpb24gPSAnbmVzdGUgbVx1MDBFNW5lZCc7XG4gICAgICAgICAgICBicmVhaztcbiAgICAgICAgICBkZWZhdWx0OlxuICAgICAgICAgICAgdG9vbFJlc3VsdCA9ICdFUlJPUjogVWd5bGRpZyBwZXJpb2RlIHNwZXNpZmlzZXJ0JztcbiAgICAgICAgfVxuXG4gICAgICAgIGlmIChzdGFydERhdGUgJiYgZW5kRGF0ZSkge1xuICAgICAgICAgIHNlbGVjdFF1ZXJ5ID0gc3VwYWJhc2VcbiAgICAgICAgICAgIC5mcm9tKCd1c2VyX3NoaWZ0cycpXG4gICAgICAgICAgICAuc2VsZWN0KCcqJylcbiAgICAgICAgICAgIC5lcSgndXNlcl9pZCcsIHVzZXJfaWQpXG4gICAgICAgICAgICAuZ3RlKCdzaGlmdF9kYXRlJywgc3RhcnREYXRlKVxuICAgICAgICAgICAgLmx0ZSgnc2hpZnRfZGF0ZScsIGVuZERhdGUpXG4gICAgICAgICAgICAub3JkZXIoJ3NoaWZ0X2RhdGUnKTtcbiAgICAgICAgfVxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgdG9vbFJlc3VsdCA9ICdFUlJPUjogSW5nZW4gc1x1MDBGOGtla3JpdGVyaWVyIHNwZXNpZmlzZXJ0JztcbiAgICAgIH1cblxuICAgICAgLy8gT25seSBwcm9jZWVkIGlmIG5vIGVycm9yIHNvIGZhclxuICAgICAgaWYgKCF0b29sUmVzdWx0LnN0YXJ0c1dpdGgoJ0VSUk9SOicpKSB7XG4gICAgICAgIGNvbnN0IHsgZGF0YTogc2hpZnRzLCBlcnJvciB9ID0gYXdhaXQgc2VsZWN0UXVlcnk7XG5cbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgdG9vbFJlc3VsdCA9ICdFUlJPUjogS3VubmUgaWtrZSBoZW50ZSBza2lmdCc7XG4gICAgICAgIH0gZWxzZSBpZiAoIXNoaWZ0cyB8fCBzaGlmdHMubGVuZ3RoID09PSAwKSB7XG4gICAgICAgICAgdG9vbFJlc3VsdCA9IGBOT05FOiBJbmdlbiBza2lmdCBmdW5uZXQgZm9yICR7Y3JpdGVyaWFEZXNjcmlwdGlvbn1gO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIC8vIENhbGN1bGF0ZSB0b3RhbCBob3Vyc1xuICAgICAgICAgIGNvbnN0IHRvdGFsSG91cnMgPSBzaGlmdHMucmVkdWNlKChzdW0sIHNoaWZ0KSA9PiB7XG4gICAgICAgICAgICByZXR1cm4gc3VtICsgaG91cnNCZXR3ZWVuKHNoaWZ0LnN0YXJ0X3RpbWUsIHNoaWZ0LmVuZF90aW1lKTtcbiAgICAgICAgICB9LCAwKTtcblxuICAgICAgICAgIC8vIEZvcm1hdCBzaGlmdHMgZm9yIHRvb2wgY29udGVudCAoWVlZWS1NTS1ERCBISDptbS1ISDptbSlcbiAgICAgICAgICBjb25zdCBmb3JtYXR0ZWRTaGlmdHMgPSBzaGlmdHMubWFwKHNoaWZ0ID0+XG4gICAgICAgICAgICBgJHtzaGlmdC5zaGlmdF9kYXRlfSAke3NoaWZ0LnN0YXJ0X3RpbWV9LSR7c2hpZnQuZW5kX3RpbWV9YFxuICAgICAgICAgICkuam9pbignLCAnKTtcblxuICAgICAgICAgIHRvb2xSZXN1bHQgPSBgT0s6ICR7c2hpZnRzLmxlbmd0aH0gc2tpZnQgZnVubmV0IGZvciAke2NyaXRlcmlhRGVzY3JpcHRpb259ICgke3RvdGFsSG91cnN9IHRpbWVyIHRvdGFsdCkuIFNraWZ0OiAke2Zvcm1hdHRlZFNoaWZ0c31gO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHRvb2xSZXN1bHQ7XG59XG5cbi8vIC0tLS0tLS0tLS0gTWFpbiBOZXRsaWZ5IEZ1bmN0aW9uIEV4cG9ydCAtLS0tLS0tLS0tXG5leHBvcnQgZGVmYXVsdCBhc3luYyAocmVxLCBjb250ZXh0KSA9PiB7XG4gIC8vIEhhbmRsZSBDT1JTIHByZWZsaWdodFxuICBpZiAocmVxLm1ldGhvZCA9PT0gJ09QVElPTlMnKSB7XG4gICAgcmV0dXJuIG5ldyBSZXNwb25zZShudWxsLCB7XG4gICAgICBzdGF0dXM6IDIwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU1ldGhvZHMnOiAnUE9TVCwgT1BUSU9OUycsXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1IZWFkZXJzJzogJ0NvbnRlbnQtVHlwZSwgQXV0aG9yaXphdGlvbicsXG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgLy8gT25seSBhbGxvdyBQT1NUIHJlcXVlc3RzXG4gIGlmIChyZXEubWV0aG9kICE9PSAnUE9TVCcpIHtcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdNZXRob2Qgbm90IGFsbG93ZWQnIH0pLCB7XG4gICAgICBzdGF0dXM6IDQwNSxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cblxuICB0cnkge1xuICAgIC8vIFBhcnNlIHJlcXVlc3QgYm9keVxuICAgIGNvbnN0IHsgbWVzc2FnZXMgfSA9IGF3YWl0IHJlcS5qc29uKCk7XG5cbiAgICAvLyBBdXRoZW50aWNhdGUgdXNlclxuICAgIGNvbnN0IHVzZXJfaWQgPSBhd2FpdCBhdXRoZW50aWNhdGVVc2VyKHJlcS5oZWFkZXJzKTtcblxuICAgIC8vIEdldCB1c2VyIGluZm9ybWF0aW9uIGZvciBwZXJzb25hbGl6YXRpb25cbiAgICBjb25zdCB7IGRhdGE6IHsgdXNlciB9LCBlcnJvcjogdXNlckVycm9yIH0gPSBhd2FpdCBzdXBhYmFzZS5hdXRoLmdldFVzZXIocmVxLmhlYWRlcnMuYXV0aG9yaXphdGlvbj8uc2xpY2UoNykpO1xuICAgIGxldCB1c2VyTmFtZSA9ICdicnVrZXInO1xuICAgIGlmICghdXNlckVycm9yICYmIHVzZXIpIHtcbiAgICAgIHVzZXJOYW1lID0gdXNlci51c2VyX21ldGFkYXRhPy5maXJzdF9uYW1lIHx8XG4gICAgICAgICAgICAgICAgIHVzZXIuZW1haWw/LnNwbGl0KCdAJylbMF0gfHxcbiAgICAgICAgICAgICAgICAgJ2JydWtlcic7XG4gICAgfVxuXG4gICAgLy8gSW5qZWN0IHJlbGF0aXZlIGRhdGVzIGFuZCB1c2VyIG5hbWUgZm9yIEdQVCBjb250ZXh0XG4gICAgY29uc3QgdG9kYXkgPSBuZXcgRGF0ZSgpLnRvTG9jYWxlRGF0ZVN0cmluZygnbm8tTk8nLCB7IHRpbWVab25lOiAnRXVyb3BlL09zbG8nIH0pO1xuICAgIGNvbnN0IHRvbW9ycm93ID0gbmV3IERhdGUoRGF0ZS5ub3coKSArIDg2NGU1KS50b0xvY2FsZURhdGVTdHJpbmcoJ25vLU5PJywgeyB0aW1lWm9uZTogJ0V1cm9wZS9Pc2xvJyB9KTtcblxuICAgIGNvbnN0IHN5c3RlbUNvbnRleHRIaW50ID0ge1xuICAgICAgcm9sZTogJ3N5c3RlbScsXG4gICAgICBjb250ZW50OiBgQnJ1a2VyZW5zIG5hdm4gZXIgJHt1c2VyTmFtZX0sIHNcdTAwRTUgZHUga2FuIGJydWtlIG5hdm5ldCBpIHN2YXJlbmUgZGluZSBmb3IgXHUwMEU1IGdqXHUwMEY4cmUgZGVtIG1lciBwZXJzb25saWdlLiBJIGRhZyBlciAke3RvZGF5fSwgaSBtb3JnZW4gZXIgJHt0b21vcnJvd30uIFN2YXIgYWxsdGlkIHBcdTAwRTUgbm9yc2suYFxuICAgIH07XG4gICAgY29uc3QgZnVsbE1lc3NhZ2VzID0gW3N5c3RlbUNvbnRleHRIaW50LCAuLi5tZXNzYWdlc107XG5cbiAgICAvLyBGaXJzdCBjYWxsOiBMZXQgR1BUIGNob29zZSB0b29sc1xuICAgIGNvbnN0IGNvbXBsZXRpb24gPSBhd2FpdCBvcGVuYWkuY2hhdC5jb21wbGV0aW9ucy5jcmVhdGUoe1xuICAgICAgbW9kZWw6ICdncHQtNG8tbWluaScsXG4gICAgICBtZXNzYWdlczogZnVsbE1lc3NhZ2VzLFxuICAgICAgdG9vbHMsXG4gICAgICB0b29sX2Nob2ljZTogJ2F1dG8nXG4gICAgfSk7XG5cbiAgICBjb25zdCBjaG9pY2UgPSBjb21wbGV0aW9uLmNob2ljZXNbMF0ubWVzc2FnZTtcblxuICAgIGlmIChjaG9pY2UudG9vbF9jYWxscyAmJiBjaG9pY2UudG9vbF9jYWxscy5sZW5ndGggPiAwKSB7XG4gICAgICAvLyBIYW5kbGUgbXVsdGlwbGUgdG9vbCBjYWxsc1xuICAgICAgY29uc3QgdG9vbE1lc3NhZ2VzID0gW107XG5cbiAgICAgIGZvciAoY29uc3QgY2FsbCBvZiBjaG9pY2UudG9vbF9jYWxscykge1xuICAgICAgICBjb25zdCB0b29sUmVzdWx0ID0gYXdhaXQgaGFuZGxlVG9vbChjYWxsLCB1c2VyX2lkKTtcbiAgICAgICAgdG9vbE1lc3NhZ2VzLnB1c2goe1xuICAgICAgICAgIHJvbGU6ICd0b29sJyxcbiAgICAgICAgICB0b29sX2NhbGxfaWQ6IGNhbGwuaWQsXG4gICAgICAgICAgbmFtZTogY2FsbC5mdW5jdGlvbi5uYW1lLFxuICAgICAgICAgIGNvbnRlbnQ6IHRvb2xSZXN1bHRcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIC8vIEFkZCB0b29sIHJlc3VsdHMgdG8gY29udmVyc2F0aW9uIGFuZCBnZXQgR1BUJ3MgcmVzcG9uc2VcbiAgICAgIGNvbnN0IG1lc3NhZ2VzV2l0aFRvb2xSZXN1bHQgPSBbXG4gICAgICAgIC4uLmZ1bGxNZXNzYWdlcyxcbiAgICAgICAge1xuICAgICAgICAgIHJvbGU6ICdhc3Npc3RhbnQnLFxuICAgICAgICAgIGNvbnRlbnQ6IGNob2ljZS5jb250ZW50LFxuICAgICAgICAgIHRvb2xfY2FsbHM6IGNob2ljZS50b29sX2NhbGxzXG4gICAgICAgIH0sXG4gICAgICAgIC4uLnRvb2xNZXNzYWdlc1xuICAgICAgXTtcblxuICAgICAgLy8gU2Vjb25kIGNhbGw6IExldCBHUFQgZm9ybXVsYXRlIGEgdXNlci1mcmllbmRseSByZXNwb25zZSB3aXRoIGVycm9yIGhhbmRsaW5nXG4gICAgICBsZXQgYXNzaXN0YW50TWVzc2FnZTtcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IHNlY29uZENvbXBsZXRpb24gPSBhd2FpdCBvcGVuYWkuY2hhdC5jb21wbGV0aW9ucy5jcmVhdGUoe1xuICAgICAgICAgIG1vZGVsOiAnZ3B0LTRvLW1pbmknLFxuICAgICAgICAgIG1lc3NhZ2VzOiBtZXNzYWdlc1dpdGhUb29sUmVzdWx0LFxuICAgICAgICAgIHRvb2xzLFxuICAgICAgICAgIHRvb2xfY2hvaWNlOiAnbm9uZSdcbiAgICAgICAgfSk7XG4gICAgICAgIGFzc2lzdGFudE1lc3NhZ2UgPSBzZWNvbmRDb21wbGV0aW9uLmNob2ljZXNbMF0ubWVzc2FnZS5jb250ZW50O1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignU2Vjb25kIEdQVCBjYWxsIGZhaWxlZDonLCBlcnJvcik7XG4gICAgICAgIC8vIEZhbGxiYWNrIG1lc3NhZ2UgYmFzZWQgb24gdG9vbCByZXN1bHRzXG4gICAgICAgIGNvbnN0IGhhc1N1Y2Nlc3MgPSB0b29sTWVzc2FnZXMuc29tZShtc2cgPT4gbXNnLmNvbnRlbnQuc3RhcnRzV2l0aCgnT0s6JykpO1xuICAgICAgICBjb25zdCBoYXNFcnJvciA9IHRvb2xNZXNzYWdlcy5zb21lKG1zZyA9PiBtc2cuY29udGVudC5zdGFydHNXaXRoKCdFUlJPUjonKSk7XG5cbiAgICAgICAgaWYgKGhhc0Vycm9yKSB7XG4gICAgICAgICAgYXNzaXN0YW50TWVzc2FnZSA9ICdEZXQgb3Bwc3RvZCBlbiBmZWlsIG1lZCBlbiBhdiBvcGVyYXNqb25lbmUuIFByXHUwMEY4diBpZ2plbi4nO1xuICAgICAgICB9IGVsc2UgaWYgKGhhc1N1Y2Nlc3MpIHtcbiAgICAgICAgICBhc3Npc3RhbnRNZXNzYWdlID0gJ09wZXJhc2pvbmVuZSBlciB1dGZcdTAwRjhydCEgXHVEODNEXHVEQzREJztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBhc3Npc3RhbnRNZXNzYWdlID0gJ09wZXJhc2pvbmVuZSBlciB1dGZcdTAwRjhydC4nO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIEdldCB1cGRhdGVkIHNoaWZ0IGxpc3RcbiAgICAgIGNvbnN0IHsgZGF0YTogc2hpZnRzIH0gPSBhd2FpdCBzdXBhYmFzZVxuICAgICAgICAuZnJvbSgndXNlcl9zaGlmdHMnKVxuICAgICAgICAuc2VsZWN0KCcqJylcbiAgICAgICAgLmVxKCd1c2VyX2lkJywgdXNlcl9pZClcbiAgICAgICAgLm9yZGVyKCdzaGlmdF9kYXRlJyk7XG5cbiAgICAgIHJldHVybiBuZXcgUmVzcG9uc2UoSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBhc3Npc3RhbnQ6IGFzc2lzdGFudE1lc3NhZ2UsXG4gICAgICAgIHNoaWZ0czogc2hpZnRzIHx8IFtdXG4gICAgICB9KSwge1xuICAgICAgICBzdGF0dXM6IDIwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBObyB0b29sIGNhbGwgLSBqdXN0IHJldHVybiBHUFQncyBkaXJlY3QgcmVzcG9uc2VcbiAgICAgIGNvbnN0IGFzc2lzdGFudE1lc3NhZ2UgPSBjaG9pY2UuY29udGVudCB8fCBcIkplZyBmb3JzdG9kIGlra2Uga29tbWFuZG9lbi5cIjtcblxuICAgICAgY29uc3QgeyBkYXRhOiBzaGlmdHMgfSA9IGF3YWl0IHN1cGFiYXNlXG4gICAgICAgIC5mcm9tKCd1c2VyX3NoaWZ0cycpXG4gICAgICAgIC5zZWxlY3QoJyonKVxuICAgICAgICAuZXEoJ3VzZXJfaWQnLCB1c2VyX2lkKVxuICAgICAgICAub3JkZXIoJ3NoaWZ0X2RhdGUnKTtcblxuICAgICAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIGFzc2lzdGFudDogYXNzaXN0YW50TWVzc2FnZSxcbiAgICAgICAgc2hpZnRzOiBzaGlmdHMgfHwgW11cbiAgICAgIH0pLCB7XG4gICAgICAgIHN0YXR1czogMjAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICB9LFxuICAgICAgfSk7XG4gICAgfVxuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0NoYXQgZnVuY3Rpb24gZXJyb3I6JywgZXJyb3IpO1xuXG4gICAgLy8gSGFuZGxlIGF1dGhlbnRpY2F0aW9uIGVycm9yc1xuICAgIGlmIChlcnJvci5tZXNzYWdlLmluY2x1ZGVzKCdBdXRob3JpemF0aW9uJykgfHwgZXJyb3IubWVzc2FnZS5pbmNsdWRlcygndG9rZW4nKSkge1xuICAgICAgcmV0dXJuIG5ldyBSZXNwb25zZShKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnVW5hdXRob3JpemVkJyB9KSwge1xuICAgICAgICBzdGF0dXM6IDQwMSxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgICAgfSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEhhbmRsZSBvdGhlciBlcnJvcnNcbiAgICByZXR1cm4gbmV3IFJlc3BvbnNlKEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InIH0pLCB7XG4gICAgICBzdGF0dXM6IDUwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgfSk7XG4gIH1cbn07XG4iXSwKICAibWFwcGluZ3MiOiAiOzs7Ozs7Ozs7O0FBQ0EsT0FBTztBQUNQLFNBQVMsY0FBYztBQUN2QixTQUFTLG9CQUFvQjtBQUc3QixJQUFNLFNBQVMsSUFBSSxPQUFPLEVBQUUsUUFBUSxRQUFRLElBQUksZUFBZSxDQUFDO0FBQ2hFLElBQU0sV0FBVztBQUFBLEVBQ2YsUUFBUSxJQUFJO0FBQUEsRUFDWixRQUFRLElBQUk7QUFDZDtBQUdBLGVBQWUsaUJBQWlCLFNBQVM7QUFFdkMsTUFBSSxRQUFRLElBQUksY0FBYyxRQUFRLElBQUksYUFBYSxjQUFjO0FBQ25FLFdBQU8sUUFBUSxJQUFJO0FBQUEsRUFDckI7QUFFQSxRQUFNLE9BQU8sUUFBUSxpQkFBaUI7QUFDdEMsTUFBSSxDQUFDLEtBQUssV0FBVyxTQUFTLEdBQUc7QUFDL0IsVUFBTSxJQUFJLE1BQU0seUNBQXlDO0FBQUEsRUFDM0Q7QUFDQSxRQUFNLFFBQVEsS0FBSyxNQUFNLENBQUM7QUFFMUIsUUFBTSxFQUFFLE1BQU0sRUFBRSxLQUFLLEdBQUcsTUFBTSxJQUFJLE1BQU0sU0FBUyxLQUFLLFFBQVEsS0FBSztBQUNuRSxNQUFJLFNBQVMsQ0FBQyxLQUFNLE9BQU0sSUFBSSxNQUFNLDBCQUEwQjtBQUU5RCxTQUFPLEtBQUs7QUFDZDtBQUdBLElBQU0saUJBQWlCO0FBQUEsRUFDckIsTUFBTTtBQUFBLEVBQ04sYUFBYTtBQUFBLEVBQ2IsWUFBWTtBQUFBLElBQ1Ys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
