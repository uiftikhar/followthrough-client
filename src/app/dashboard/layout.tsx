import { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { cookies } from "next/headers";

// Auth options for getServerSession
import { authOptions } from "@/lib/auth";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default async function Layout({ children }: DashboardLayoutProps) {
  // First check if there's a Next Auth session
  const session = await getServerSession(authOptions);

  // If there's no session, check if there's a token in the cookies
  if (!session) {
    const cookieStore = cookies();
    const authToken = cookieStore.get("auth_token");

    // If no auth token, redirect to login
    if (!authToken) {
      redirect("/auth/login");
    }
  }

  return <DashboardLayout>{children}</DashboardLayout>;
}
