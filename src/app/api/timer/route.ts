// src/app/api/timer/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const timerState = await prisma.timerState.findFirst({
      where: {
        userId: "tiwariParth", // We'll use the current user's login
      },
      orderBy: { lastUpdate: "desc" },
    });
    return NextResponse.json(timerState);
  } catch (error) {
    return Response.json({ success: false }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const timerState = await prisma.timerState.create({
      data: {
        userId: "tiwariParth",
        timeLeft: data.timeLeft,
        isActive: data.isActive,
        isBreak: data.isBreak,
        focusDuration: data.focusDuration,
        breakDuration: data.breakDuration,
      },
    });
    return NextResponse.json(timerState);
  } catch (error) {
    return Response.json({ success: false }, { status: 500 });
  }
}
