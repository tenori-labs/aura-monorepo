"use client";

import * as React from "react";
import { Box, Container } from "@radix-ui/themes";
import { ThemeToggle } from "@/components/theme-toggle";

export default function ChartsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <Box className="pt-24" style={{ background: "var(--gray-a2)", borderRadius: "var(--radius-3)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: "1rem", right: "1rem", zIndex: 10 }}>
                <ThemeToggle />
            </div>
            <Container size="4" style={{ width: "100%", maxWidth: "100%" }}>
                {children}
            </Container>
        </Box>
    );
}

