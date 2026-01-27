import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { locationIds } = await request.json()

    if (!locationIds || !Array.isArray(locationIds)) {
      return NextResponse.json({ error: "locationIds array is required" }, { status: 400 })
    }

    // Get staff counts for each location
    const { data: staffCounts, error } = await supabase
      .from("user_profiles")
      .select("assigned_location, id")
      .in("assigned_location", locationIds)
      .eq("is_active", true)

    if (error) {
      console.error("Error fetching staff counts:", error)
      return NextResponse.json({ error: "Failed to fetch staff counts" }, { status: 500 })
    }

    // Count staff per location
    const counts: Record<string, number> = {}
    locationIds.forEach(locationId => {
      counts[locationId] = 0
    })

    staffCounts?.forEach(staff => {
      if (staff.assigned_location && counts[staff.assigned_location] !== undefined) {
        counts[staff.assigned_location]++
      }
    })

    return NextResponse.json(counts)
  } catch (error) {
    console.error("Error in location-staff-counts API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}