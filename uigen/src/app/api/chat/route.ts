import type { FileNode } from "@/lib/file-system";
import { VirtualFileSystem } from "@/lib/file-system";
import { streamText } from "ai";
import { buildStrReplaceTool } from "@/lib/tools/str-replace";
import { buildFileManagerTool } from "@/lib/tools/file-manager";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { getLanguageModel } from "@/lib/provider";
import { generationPrompt } from "@/lib/prompts/generation";

export async function POST(req: Request) {
  const {
    messages,
    files,
    projectId,
  }: { messages: any[]; files: Record<string, FileNode>; projectId?: string } =
    await req.json();

  // Convert UIMessages to the format expected by streamText
  // UIMessage format has { role, content: { parts: [{ type, text }] } } or { role, content: string }
  // streamText expects { role, content: string }
  const convertedMessages = messages.map((msg: any) => {
    if (!msg.role) return msg;

    let content = "";

    // Handle different content formats
    if (typeof msg.content === "string") {
      content = msg.content;
    } else if (typeof msg.content === "object" && msg.content?.parts) {
      // Extract text from parts array
      content = msg.content.parts
        .filter((part: any) => part?.type === "text")
        .map((part: any) => part?.text || "")
        .join("");
    } else if (typeof msg.content === "object" && Array.isArray(msg.content)) {
      // Handle array of content parts
      content = msg.content
        .filter((part: any) => part?.type === "text")
        .map((part: any) => part?.text || "")
        .join("");
    } else if (msg.content === undefined || msg.content === null) {
      // Handle undefined/null content
      content = "";
    } else {
      // Fallback: convert to string
      content = String(msg.content);
    }

    // Only include messages that have content (excluding any metadata fields)
    if (msg.role === "tool") {
      // Tool messages need special handling
      return {
        role: "tool",
        content: content,
        toolUseId: msg.toolUseId || msg.toolCallId,
      };
    } else if (msg.role === "user" || msg.role === "assistant") {
      return {
        role: msg.role,
        content: content,
      };
    }

    return msg;
  }).filter(msg => msg.content || msg.role === "tool"); // Filter out messages with empty content

  // Reconstruct the VirtualFileSystem from serialized data
  const fileSystem = new VirtualFileSystem();
  fileSystem.deserializeFromNodes(files || {});

  const model = getLanguageModel();
  // Use fewer steps for mock provider to prevent repetition
  const isMockProvider = !process.env.ANTHROPIC_API_KEY;
  const result = streamText({
    model,
    system: generationPrompt,
    messages: convertedMessages,
    maxTokens: 10_000,
    maxSteps: isMockProvider ? 4 : 40,
    onError: (err: any) => {
      console.error(err);
    },
    tools: {
      str_replace_editor: buildStrReplaceTool(fileSystem),
      file_manager: buildFileManagerTool(fileSystem),
    },
    onFinish: async ({ response }) => {
      // Save to project if projectId is provided and user is authenticated
      if (projectId) {
        try {
          const session = await getSession();
          if (!session) {
            console.error("User not authenticated, cannot save project");
            return;
          }

          const responseMessages = response.messages || [];
          const allMessages = [
            ...messages.filter((m) => m.role !== "system"),
            ...responseMessages,
          ];

          await prisma.project.update({
            where: {
              id: projectId,
              userId: session.userId,
            },
            data: {
              messages: JSON.stringify(allMessages),
              data: JSON.stringify(fileSystem.serialize()),
            },
          });
        } catch (error) {
          console.error("Failed to save project data:", error);
        }
      }
    },
  });

  return new Response(result.fullStream, {
    headers: { "Content-Type": "text/plain" },
  });
}

export const maxDuration = 120;
