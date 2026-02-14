import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const SETUPS_FILE = path.join(DATA_DIR, "setups.json");

interface SetupEntry {
  harnessId: string;
  name: string;
  role: string;
  location: string;
  goals: string[];
  goalFreeText: string;
  challenge: string;
  challengeFreeText: string;
  selectedPacks: string[];
  createdAt: string;
}

async function readSetups(): Promise<SetupEntry[]> {
  try {
    const raw = await readFile(SETUPS_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

async function writeSetups(entries: SetupEntry[]): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(SETUPS_FILE, JSON.stringify(entries, null, 2), "utf-8");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = (body.name ?? "").trim();
    const role = (body.role ?? "").trim();

    if (!name) {
      return NextResponse.json(
        { success: false, message: "Name is required." },
        { status: 400 }
      );
    }

    if (!role) {
      return NextResponse.json(
        { success: false, message: "Role is required." },
        { status: 400 }
      );
    }

    const harnessId = randomUUID();

    const entry: SetupEntry = {
      harnessId,
      name,
      role,
      location: (body.location ?? "").trim(),
      goals: Array.isArray(body.goals) ? body.goals : [],
      goalFreeText: (body.goalFreeText ?? "").trim(),
      challenge: (body.challenge ?? "").trim(),
      challengeFreeText: (body.challengeFreeText ?? "").trim(),
      selectedPacks: Array.isArray(body.selectedPacks)
        ? body.selectedPacks
        : [],
      createdAt: new Date().toISOString(),
    };

    const entries = await readSetups();
    entries.push(entry);
    await writeSetups(entries);

    return NextResponse.json({ success: true, harnessId });
  } catch {
    return NextResponse.json(
      { success: false, message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
