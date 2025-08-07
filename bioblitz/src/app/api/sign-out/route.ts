import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    (await cookies()).delete("session");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error signing out:", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
