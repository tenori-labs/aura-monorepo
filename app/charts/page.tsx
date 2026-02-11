"use client";

import * as React from "react";
import {
    Box,
    Card,
    Flex,
    Grid,
    Heading,
    Text,
} from "@radix-ui/themes";
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    AreaChart,
    Area,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";

const lineData = [
    { name: "Jan", value: 4000 },
    { name: "Feb", value: 3000 },
    { name: "Mar", value: 2000 },
    { name: "Apr", value: 2780 },
    { name: "May", value: 1890 },
    { name: "Jun", value: 2390 },
    { name: "Jul", value: 3490 },
];

const barData = [
    { name: "Mon", sales: 4000, revenue: 2400 },
    { name: "Tue", sales: 3000, revenue: 1398 },
    { name: "Wed", sales: 2000, revenue: 9800 },
    { name: "Thu", sales: 2780, revenue: 3908 },
    { name: "Fri", sales: 1890, revenue: 4800 },
    { name: "Sat", sales: 2390, revenue: 3800 },
    { name: "Sun", sales: 3490, revenue: 4300 },
];

const areaData = [
    { name: "Q1", users: 4000, sessions: 2400 },
    { name: "Q2", users: 3000, sessions: 1398 },
    { name: "Q3", users: 2000, sessions: 9800 },
    { name: "Q4", users: 2780, sessions: 3908 },
];

const pieData = [
    { name: "Desktop", value: 400, color: "var(--accent-10)" },
    { name: "Mobile", value: 300, color: "var(--amber-10)" },
    { name: "Tablet", value: 200, color: "var(--accent-11)" },
    { name: "Other", value: 100, color: "var(--amber-11)" },
];

const COLORS = [
    "var(--accent-10)",
    "var(--amber-10)",
    "var(--accent-11)",
    "var(--amber-11)",
    "var(--accent-12)",
];

export default function ChartsPage() {
    return (
        <Flex align="start" gap="6" direction="column" style={{ width: "100%", padding: "2rem 0" }}>
            <Box style={{ width: "100%" }}>
                <Heading as="h1" size="9" mb="2">
                    Charts
                </Heading>
                <Text as="p" size="3" color="gray" mb="6">
                    Visualize your data with beautiful charts powered by Recharts and Radix UI.
                </Text>
            </Box>

            <Grid columns={{ initial: "1", md: "2" }} gap="6" style={{ width: "100%" }}>
                {/* Line Chart */}
                <Card size="4">
                    <Heading as="h3" size="6" trim="start" mb="2">
                        Line Chart
                    </Heading>
                    <Text as="p" size="2" mb="5" color="gray">
                        Monthly revenue trends
                    </Text>
                    <Box style={{ width: "100%", height: "300px" }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={lineData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-a6)" />
                                <XAxis
                                    dataKey="name"
                                    stroke="var(--gray-11)"
                                    style={{ fontSize: "12px" }}
                                />
                                <YAxis
                                    stroke="var(--gray-11)"
                                    style={{ fontSize: "12px" }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "var(--gray-2)",
                                        border: "1px solid var(--gray-6)",
                                        borderRadius: "var(--radius-2)",
                                    }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="value"
                                    stroke="var(--accent-10)"
                                    strokeWidth={2}
                                    dot={{ fill: "var(--accent-10)", r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </Box>
                </Card>

                {/* Bar Chart */}
                <Card size="4">
                    <Heading as="h3" size="6" trim="start" mb="2">
                        Bar Chart
                    </Heading>
                    <Text as="p" size="2" mb="5" color="gray">
                        Sales and revenue comparison
                    </Text>
                    <Box style={{ width: "100%", height: "300px" }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={barData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-a6)" />
                                <XAxis
                                    dataKey="name"
                                    stroke="var(--gray-11)"
                                    style={{ fontSize: "12px" }}
                                />
                                <YAxis
                                    stroke="var(--gray-11)"
                                    style={{ fontSize: "12px" }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "var(--gray-2)",
                                        border: "1px solid var(--gray-6)",
                                        borderRadius: "var(--radius-2)",
                                    }}
                                />
                                <Legend />
                                <Bar dataKey="sales" fill="var(--accent-10)" />
                                <Bar dataKey="revenue" fill="var(--amber-10)" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Box>
                </Card>

                {/* Area Chart */}
                <Card size="4">
                    <Heading as="h3" size="6" trim="start" mb="2">
                        Area Chart
                    </Heading>
                    <Text as="p" size="2" mb="5" color="gray">
                        Quarterly user growth
                    </Text>
                    <Box style={{ width: "100%", height: "300px" }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={areaData}>
                                <defs>
                                    <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--accent-10)" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="var(--accent-10)" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="var(--amber-10)" stopOpacity={0.8} />
                                        <stop offset="95%" stopColor="var(--amber-10)" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-a6)" />
                                <XAxis
                                    dataKey="name"
                                    stroke="var(--gray-11)"
                                    style={{ fontSize: "12px" }}
                                />
                                <YAxis
                                    stroke="var(--gray-11)"
                                    style={{ fontSize: "12px" }}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "var(--gray-2)",
                                        border: "1px solid var(--gray-6)",
                                        borderRadius: "var(--radius-2)",
                                    }}
                                />
                                <Legend />
                                <Area
                                    type="monotone"
                                    dataKey="users"
                                    stroke="var(--accent-10)"
                                    fillOpacity={1}
                                    fill="url(#colorUsers)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="sessions"
                                    stroke="var(--amber-10)"
                                    fillOpacity={1}
                                    fill="url(#colorSessions)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Box>
                </Card>

                {/* Pie Chart */}
                <Card size="4">
                    <Heading as="h3" size="6" trim="start" mb="2">
                        Pie Chart
                    </Heading>
                    <Text as="p" size="2" mb="5" color="gray">
                        Device distribution
                    </Text>
                    <Box style={{ width: "100%", height: "300px" }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ name, percent = 0 }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                    outerRadius={80}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {pieData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: "var(--gray-2)",
                                        border: "1px solid var(--gray-6)",
                                        borderRadius: "var(--radius-2)",
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </Box>
                </Card>
            </Grid>

            {/* Full Width Chart */}
            <Card size="4" style={{ width: "100%" }}>
                <Heading as="h3" size="6" trim="start" mb="2">
                    Combined Chart
                </Heading>
                <Text as="p" size="2" mb="5" color="gray">
                    Comprehensive overview with multiple metrics
                </Text>
                <Box style={{ width: "100%", height: "400px" }}>
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-a6)" />
                            <XAxis
                                dataKey="name"
                                stroke="var(--gray-11)"
                                style={{ fontSize: "12px" }}
                            />
                            <YAxis
                                stroke="var(--gray-11)"
                                style={{ fontSize: "12px" }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "var(--gray-2)",
                                    border: "1px solid var(--gray-6)",
                                    borderRadius: "var(--radius-2)",
                                }}
                            />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke="var(--accent-10)"
                                strokeWidth={2}
                                name="Revenue"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </Box>
            </Card>
        </Flex>
    );
}

