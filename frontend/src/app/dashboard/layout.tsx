"use client";

import Providers from "../providers";
import DashboardShell from "./DashboardShell";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <Providers>
            <DashboardShell>{children}</DashboardShell>
        </Providers>
    );
}
