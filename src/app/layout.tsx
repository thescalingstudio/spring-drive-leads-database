import type { Metadata } from "next";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lead database",
  description: "View and filter leads by campaign and client",
};

/** Always run layout on the server with fresh auth so admin role is up to date */
export const dynamic = "force-dynamic";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-[#fafafa] text-gray-900 font-sans">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <header className="border-b border-gray-200/80 bg-white/80 backdrop-blur-sm">
            <nav className="flex h-14 items-center justify-between gap-8">
              <div className="flex items-center gap-8">
                <Link href="/" className="text-sm font-medium text-gray-900 hover:text-gray-600">
                  Leads
                </Link>
                <Link href="/interactions" className="text-sm font-medium text-gray-500 hover:text-gray-900">
                  Interactions
                </Link>
                {user?.role === "admin" && (
                  <Link
                    href="/admin/users"
                    className="rounded-md bg-amber-100 px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-200"
                  >
                    Manage users
                  </Link>
                )}
              </div>
              {user && (
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">{user.email}</span>
                  <form action={signOut}>
                    <button
                      type="submit"
                      className="text-sm font-medium text-gray-600 hover:text-gray-900"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              )}
            </nav>
          </header>
          <main className="py-8">{children}</main>
        </div>
      </body>
    </html>
  );
}
