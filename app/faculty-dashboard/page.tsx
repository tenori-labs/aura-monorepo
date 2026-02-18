import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
    Avatar,
    Badge,
    Card,
    Flex,
    Heading,
    Separator,
    Text,
} from "@radix-ui/themes";
import { PageHeader } from "@/components/page-header";
import { PageFooter } from "@/components/page-footer";
import { FacultyIncidentTable } from "@/components/faculty-incident-table";
import prisma from "@/lib/db";
import { getUserRole, canAccessFacultyRoutes } from "@/lib/roles";

export default async function FacultyDashboardPage() {
    const supabase = await createClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Second layer of defense (middleware is first)
    if (!user) {
        redirect("/");
    }

    if (!canAccessFacultyRoutes(user)) {
        redirect("/dashboard");
    }

    const role = getUserRole(user);

    // Admins have their own dashboard
    if (role === "admin") {
        redirect("/admin-dashboard");
    }
    const email = user.email ?? "No email";
    const name =
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        email.split("@")[0];
    const avatarUrl = user.user_metadata?.avatar_url ?? "";
    const initials = name.charAt(0).toUpperCase();

    // Look up which categories this faculty is assigned to
    const myCategories = await prisma.categoryAssignment.findMany({
        where: { facultyId: user.id },
        select: { category: true },
    });
    const categoryNames = myCategories.map((c: { category: string }) => c.category);

    const incidents = categoryNames.length > 0
        ? await prisma.incidentReport.findMany({
            where: { incidentType: { in: categoryNames } },
            orderBy: { createdAt: "desc" },
        })
        : [];

    // Fetch category assignments for the timeline to display
    const allAssignments = await prisma.categoryAssignment.findMany();
    const categoryAssignmentMap: Record<string, string> = {};
    for (const a of allAssignments) {
        categoryAssignmentMap[a.category] = a.facultyEmail; // stores faculty name
    }

    // Stats
    const totalReports = incidents.length;
    const pendingCount = incidents.filter((i) => i.status === "pending").length;
    const assignedCount = incidents.filter((i) => i.status === "assigned" || categoryAssignmentMap[i.incidentType]).length;
    const reviewingCount = incidents.filter((i) => i.status === "reviewing").length;
    const resolvedCount = incidents.filter((i) => i.status === "resolved").length;

    return (
        <div
            className="font-sans"
            style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                background: "var(--gray-a2)",
            }}
        >
            <PageHeader
                title="Faculty Dashboard"
                subtitle={`Welcome, ${name}!`}
                userRole={role}
            />

            {/* ─── Main Content ─── */}
            <Flex
                direction="column"
                gap="5"
                px={{ initial: "4", sm: "6" }}
                py="5"
                style={{
                    flex: 1,
                    overflow: "auto",
                    maxWidth: "1000px",
                    width: "100%",
                    margin: "0 auto",
                }}
            >
                {/* ─── Faculty Profile Card ─── */}
                <Card size="2">
                    <Flex direction={{ initial: "column", sm: "row" }} gap="4" align={{ initial: "center", sm: "start" }} py="3">
                        <Avatar
                            size="6"
                            src={avatarUrl}
                            fallback={initials}
                            radius="full"
                        />
                        <Flex direction="column" gap="2" style={{ flex: 1, width: "100%" }}>
                            <Flex align="center" gap="2" wrap="wrap" justify={{ initial: "center", sm: "start" }}>
                                <Text size="4" weight="bold">
                                    {name}
                                </Text>
                                <Badge color="violet" variant="soft" size="1">
                                    Faculty
                                </Badge>
                            </Flex>

                            <Separator size="4" />

                            <Flex direction="column" gap="1">
                                <Flex justify="between" wrap="wrap" gap="1">
                                    <Text size="2" color="gray">Email</Text>
                                    <Text size="2" weight="medium" style={{ wordBreak: "break-all", textAlign: "right", maxWidth: "65%" }}>
                                        {email}
                                    </Text>
                                </Flex>
                                <Flex justify="between" wrap="wrap" gap="1">
                                    <Text size="2" color="gray">Department</Text>
                                    <Text size="2" weight="medium">Computer Science</Text>
                                </Flex>
                                <Flex justify="between" wrap="wrap" gap="1">
                                    <Text size="2" color="gray">Role</Text>
                                    <Text size="2" weight="medium" style={{ textTransform: "capitalize" }}>{role}</Text>
                                </Flex>
                            </Flex>
                        </Flex>
                    </Flex>
                </Card>

                {/* ─── Stats Overview ─── */}
                <Flex gap="3" wrap="wrap">
                    <Card size="1" style={{ flex: "1 1 120px", minWidth: "120px" }}>
                        <Flex direction="column" align="center" gap="1" py="2">
                            <Text size="5" weight="bold">{totalReports}</Text>
                            <Text size="1" color="gray">Total Reports</Text>
                        </Flex>
                    </Card>
                    <Card size="1" style={{ flex: "1 1 120px", minWidth: "120px" }}>
                        <Flex direction="column" align="center" gap="1" py="2">
                            <Text size="5" weight="bold" color="blue">{pendingCount}</Text>
                            <Text size="1" color="gray">Pending</Text>
                        </Flex>
                    </Card>
                    <Card size="1" style={{ flex: "1 1 120px", minWidth: "120px" }}>
                        <Flex direction="column" align="center" gap="1" py="2">
                            <Text size="5" weight="bold" color="violet">{assignedCount}</Text>
                            <Text size="1" color="gray">Assigned</Text>
                        </Flex>
                    </Card>
                    <Card size="1" style={{ flex: "1 1 120px", minWidth: "120px" }}>
                        <Flex direction="column" align="center" gap="1" py="2">
                            <Text size="5" weight="bold" color="orange">{reviewingCount}</Text>
                            <Text size="1" color="gray">In Review</Text>
                        </Flex>
                    </Card>
                    <Card size="1" style={{ flex: "1 1 120px", minWidth: "120px" }}>
                        <Flex direction="column" align="center" gap="1" py="2">
                            <Text size="5" weight="bold" color="green">{resolvedCount}</Text>
                            <Text size="1" color="gray">Resolved</Text>
                        </Flex>
                    </Card>
                </Flex>

                {/* ─── Incident Reports Section ─── */}
                <Flex direction="column" gap="3">
                    <Flex justify="between" align="center" wrap="wrap" gap="2">
                        <Flex direction="column" gap="1">
                            <Heading size={{ initial: "3", sm: "4" }}>All Incident Reports</Heading>
                            <Text size="2" color="gray">
                                Click any report to view full details and AI analysis.
                            </Text>
                        </Flex>
                        <Badge variant="surface" size="2">
                            {totalReports} {totalReports === 1 ? "report" : "reports"}
                        </Badge>
                    </Flex>

                    {incidents.length === 0 ? (
                        <Card size="2">
                            <Flex direction="column" align="center" gap="2" py="5">
                                <Text size="3" color="gray" weight="medium">No reports yet</Text>
                                <Text size="2" color="gray">
                                    Incident reports submitted by students will appear here.
                                </Text>
                            </Flex>
                        </Card>
                    ) : (
                        <FacultyIncidentTable
                            incidents={JSON.parse(JSON.stringify(incidents))}
                            categoryAssignments={categoryAssignmentMap}
                            assignedCategories={
                                allAssignments
                                    .filter((a: { facultyId: string }) => a.facultyId === user.id)
                                    .map((a: { category: string }) => a.category)
                            }
                            allCategories={[
                                "Academic Integrity",
                                "Harassment/Bullying",
                                "Safety/Security",
                                "Medical Emergency",
                                "Facilities Issue",
                                "Other",
                            ]}
                            isAdmin={false}
                        />
                    )}
                </Flex>
            </Flex >

            {/* ─── Responsive Styles ─── */}
            < style > {`
                @media (max-width: 640px) {
                    .hide-on-mobile { display: none !important; }
                }
                @media (min-width: 641px) {
                    .hide-on-desktop { display: none !important; }
                }
            `}</style >
            <PageFooter />
        </div >
    );
}
