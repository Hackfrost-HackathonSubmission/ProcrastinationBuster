// src/app/api/settings/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const settings = await prisma.userSettings.findUnique({
      where: {
        userId: "tiwariParth",
      },
    });

    if (!settings) {
      // Create default settings if none exist
      return NextResponse.json(
        await prisma.userSettings.create({
          data: {
            userId: "tiwariParth",
            focusDuration: 25,
            breakDuration: 5,
          },
        })
      );
    }

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const data = await request.json();
    const settings = await prisma.userSettings.upsert({
      where: {
        userId: "tiwariParth",
      },
      update: {
        focusDuration: data.focusDuration,
        breakDuration: data.breakDuration,
      },
      create: {
        userId: "tiwariParth",
        focusDuration: data.focusDuration,
        breakDuration: data.breakDuration,
      },
    });
    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
