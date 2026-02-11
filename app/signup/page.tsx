"use client";

import { Box, Button, Card, Flex, Heading, Link, Text, TextField } from "@radix-ui/themes";
import { ThemeToggle } from "@/components/theme-toggle";
import { signup } from "@/app/auth/actions";
import { useSearchParams } from "next/navigation";
import { CheckIcon } from "@radix-ui/react-icons";
import { Marker } from "@/components/Marker";
import { Suspense, useState } from "react";

function SignupForm() {
    const searchParams = useSearchParams();
    const error = searchParams.get("error");
    const message = searchParams.get("message");
    const [selectedRole, setSelectedRole] = useState<"student" | "faculty">("student");

    return (
        <div
            className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black"
            style={{ padding: "env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)" }}
        >
            <div style={{ position: "absolute", top: "1rem", right: "1rem" }}>
                <ThemeToggle />
            </div>
            <Flex direction="column" align="center" gap="6" style={{ width: "100%", maxWidth: "416px", padding: "0 1rem" }}>
                <Card size={{ initial: "2", sm: "4" }} style={{ width: "100%" }}>
                    {message ? (
                        <Flex gap="3" direction="column" align="center" py="6">
                            <Marker height="48px" width="48px">
                                <CheckIcon width="32" height="32" />
                            </Marker>
                            <Heading as="h3" size="6" mb="2">
                                Check your email
                            </Heading>
                            <Text as="p" size="3" align="center" color="gray">
                                {message}
                            </Text>
                            <Link href="/login" size="2" mt="4">
                                Back to sign in
                            </Link>
                        </Flex>
                    ) : (
                        <>
                            <Heading as="h3" size="6" trim="start" mb="2">
                                Create an account
                            </Heading>

                            <Text as="p" size="2" mb="5" color="gray">
                                Get started with your new account.
                            </Text>

                            {error && (
                                <Box mb="4" p="3" style={{ backgroundColor: "var(--red-a3)", borderRadius: "var(--radius-2)" }}>
                                    <Text size="2" color="red">
                                        {error}
                                    </Text>
                                </Box>
                            )}

                            <Flex direction="column" asChild>
                                <form>
                                    {/* Role Selector */}
                                    <Flex
                                        gap="0"
                                        mb="5"
                                        style={{
                                            borderRadius: "var(--radius-2)",
                                            border: "1px solid var(--gray-a6)",
                                            overflow: "hidden",
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => setSelectedRole("student")}
                                            style={{
                                                flex: 1,
                                                padding: "10px 16px",
                                                border: "none",
                                                borderRight: "1px solid var(--gray-a6)",
                                                background: selectedRole === "student"
                                                    ? "var(--accent-a3)"
                                                    : "transparent",
                                                color: selectedRole === "student"
                                                    ? "var(--accent-11)"
                                                    : "var(--gray-11)",
                                                cursor: "pointer",
                                                fontWeight: selectedRole === "student" ? 600 : 400,
                                                fontSize: "14px",
                                                transition: "all 0.15s ease",
                                            }}
                                        >
                                            Student
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedRole("faculty")}
                                            style={{
                                                flex: 1,
                                                padding: "10px 16px",
                                                border: "none",
                                                background: selectedRole === "faculty"
                                                    ? "var(--accent-a3)"
                                                    : "transparent",
                                                color: selectedRole === "faculty"
                                                    ? "var(--accent-11)"
                                                    : "var(--gray-11)",
                                                cursor: "pointer",
                                                fontWeight: selectedRole === "faculty" ? 600 : 400,
                                                fontSize: "14px",
                                                transition: "all 0.15s ease",
                                            }}
                                        >
                                            Faculty
                                        </button>
                                    </Flex>
                                    <input type="hidden" name="role" value={selectedRole} />

                                    {/* Full Name */}
                                    <Box mb="4">
                                        <Text as="label" htmlFor="signup-fullname" size="2" weight="bold" mb="1" style={{ display: "block" }}>
                                            Full Name
                                        </Text>
                                        <TextField.Root
                                            radius="small"
                                            id="signup-fullname"
                                            name="fullName"
                                            type="text"
                                            placeholder="Enter your full name"
                                            required
                                        />
                                    </Box>

                                    {/* Email */}
                                    <Box mb="4">
                                        <Text as="label" htmlFor="signup-email" size="2" weight="bold" mb="1" style={{ display: "block" }}>
                                            Email address
                                        </Text>
                                        <TextField.Root
                                            radius="small"
                                            id="signup-email"
                                            name="email"
                                            type="email"
                                            placeholder="Enter your email"
                                            required
                                        />
                                    </Box>

                                    {/* Password */}
                                    <Box mb="4">
                                        <Text as="label" size="2" weight="bold" htmlFor="signup-password" mb="1" style={{ display: "block" }}>
                                            Password
                                        </Text>
                                        <TextField.Root
                                            radius="small"
                                            id="signup-password"
                                            name="password"
                                            type="password"
                                            placeholder="Create a password"
                                            required
                                        />
                                    </Box>

                                    <Flex mt="5" justify="end" gap="3" align="center">
                                        <Link href="/login" size="2">
                                            Already have an account?
                                        </Link>
                                        <Button type="submit" formAction={signup}>
                                            Create account
                                        </Button>
                                    </Flex>
                                </form>
                            </Flex>
                        </>
                    )}
                </Card>
            </Flex>
        </div>
    );
}

export default function SignupPage() {
    return (
        <Suspense>
            <SignupForm />
        </Suspense>
    );
}
