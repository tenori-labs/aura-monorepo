
"use client";

import type { Report } from "@/lib/types";
import { useState, useMemo } from "react";
import Link from "next/link";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
  TableCaption,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, subDays, subHours } from "date-fns";
import { FileSearch, ArrowUpDown, Search, Eye, UserCheck2, RotateCcw, BarChart2, PieChart as PieChartIcon } from "lucide-react";

import { Bar, BarChart, Pie, PieChart, ResponsiveContainer, XAxis, YAxis, Tooltip as RechartsTooltip, Cell } from "recharts";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart";

const incidentTypes = ["Theft", "Harassment", "Vandalism", "Assault", "Academic Misconduct", "Safety Concern", "Cyberbullying", "Noise Complaint", "Maintenance Issue", "Medical Emergency"] as const;
const statuses: Report['status'][] = ["Submitted", "In Review", "Resolved", "Closed"];
const locations = ["Main Library", "Science Building - Lab 301", "Student Dorm - West Wing", "Cafeteria", "Sports Complex", "Online - University Portal", "Parking Lot B", "Lecture Hall A101", "Admin Building - G02", "Arts Quad"];
const facultyMembers = Array.from({ length: 10 }, (_, i) => `Dr. Faculty ${String.fromCharCode(65 + i)}`);

// Function to generate dummy reports
const generateDummyReports = (count: number): Report[] => {
  const reports: Report[] = [];
  const now = new Date();
  for (let i = 1; i <= count; i++) {
    const dateReported = subDays(subHours(now, Math.random() * 72), Math.random() * 30);
    const lastUpdated = subHours(dateReported, Math.random() * -48); 
    const incidentDateTime = subHours(dateReported, Math.random() * 24 + 1); 

    const randomIncidentType = incidentTypes[Math.floor(Math.random() * incidentTypes.length)];
    let randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
    const randomLocation = locations[Math.floor(Math.random() * locations.length)];

    let assignedTo: string | undefined = undefined;
    if (i % 4 === 0) { // Assign to faculty for roughly 25% of reports
      assignedTo = facultyMembers[Math.floor(Math.random() * facultyMembers.length)];
      if (randomStatus === 'Submitted') randomStatus = 'In Review'; // If assigned, likely in review
    }

    reports.push({
      id: `RPT-${String(1000 + i).padStart(4, '0')}`,
      incidentType: randomIncidentType,
      dateTime: incidentDateTime.toISOString(),
      location: randomLocation,
      description: `This is a detailed description for incident #${i} regarding ${randomIncidentType.toLowerCase()} at ${randomLocation}. Issue involves lorem ipsum dolor sit amet, consectetur adipiscing elit. Further details include specific observations and witness accounts if available. The impact of this incident is currently being assessed by the relevant campus authorities. Follow-up actions are pending based on the outcome of the initial review.`,
      status: randomStatus,
      dateReported: dateReported.toISOString(),
      lastUpdated: lastUpdated.toISOString(),
      aiClassification: {
        category: randomIncidentType,
        confidence: Math.random() * (0.99 - 0.7) + 0.7,
        keywords: ["dummy", randomIncidentType.toLowerCase().split(" ")[0], randomLocation.toLowerCase().split(" ")[0].replace("-","")],
      },
      contactInfo: Math.random() > 0.5 ? `user${i}@example.com` : undefined,
      assignedTo: assignedTo,
    });
  }
  return reports;
};

// Pre-generate reports to remove loading latency from the UI
const initialReports = generateDummyReports(50);

export default function AdminPortalPage() {
  const [reports] = useState<Report[]>(initialReports);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const incidentTypeData = useMemo(() => {
    const counts = new Map<string, number>();
    reports.forEach(report => {
        counts.set(report.incidentType, (counts.get(report.incidentType) || 0) + 1);
    });
    return Array.from(counts, ([name, total]) => ({ name, total })).sort((a,b) => b.total - a.total);
  }, [reports]);

  const typeChartConfig = {
    total: {
      label: "Total",
      color: "hsl(var(--chart-1))",
    },
  } satisfies ChartConfig;
  
  const statusData = useMemo(() => {
    const statusColorMap: Record<Report['status'], string> = {
        Submitted: "hsl(var(--chart-1))",
        "In Review": "hsl(var(--chart-2))",
        Resolved: "hsl(var(--chart-3))",
        Closed: "hsl(var(--chart-4))",
    };
    const counts = new Map<Report['status'], number>();
    reports.forEach(report => {
        counts.set(report.status, (counts.get(report.status) || 0) + 1);
    });
    return Array.from(counts, ([name, value]) => ({ name, value, fill: statusColorMap[name] }));
  }, [reports]);

  const statusChartConfig = {
    value: { label: "Incidents" },
    ...statusData.reduce((acc, cur) => ({...acc, [cur.name]: { label: cur.name, color: cur.fill } }), {})
  } satisfies ChartConfig;


  const handleTypeClick = (data: any) => {
    if (data && data.activeLabel) {
      setTypeFilter(prev => prev === data.activeLabel ? 'all' : data.activeLabel);
    }
  };

  const handleStatusClick = (data: any) => {
      if (data && data.name) {
          setStatusFilter(prev => prev === data.name ? 'all' : data.name);
      }
  };

  const handleResetFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setTypeFilter("all");
  };

  const filteredReports = useMemo(() => {
    return reports
      .filter((report) =>
        statusFilter === "all" ? true : report.status === statusFilter
      )
      .filter((report) =>
        typeFilter === "all" ? true : report.incidentType === typeFilter
      )
      .filter((report) =>
        report.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        report.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (report.assignedTo && report.assignedTo.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (report.aiClassification?.keywords.some(kw => kw.toLowerCase().includes(searchTerm.toLowerCase())))
      );
  }, [reports, searchTerm, statusFilter, typeFilter]);

  const getStatusVariant = (status: Report['status']): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'Submitted': return 'default';
      case 'In Review': return 'secondary';
      case 'Resolved': return 'outline';
      case 'Closed': return 'destructive';
      default: return 'default';
    }
  };


  return (
    <div className="space-y-6">
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
                <CardTitle className="text-2xl font-bold tracking-tight text-primary flex items-center">
                    <FileSearch className="mr-3 h-7 w-7" /> Admin Incident Management
                </CardTitle>
                <CardDescription>
                    View, filter, and manage all reported incidents. Click chart elements to filter data.
                </CardDescription>
            </div>
             <Button variant="outline" onClick={handleResetFilters}>
                <RotateCcw className="mr-2 h-4 w-4" />
                Reset Filters
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle className="flex items-center"><BarChart2 className="mr-2 h-5 w-5 text-primary"/> Incidents by Type</CardTitle>
              </CardHeader>
              <CardContent>
                 <ChartContainer config={typeChartConfig} className="min-h-[250px] w-full">
                    <BarChart accessibilityLayer data={incidentTypeData} onClick={handleTypeClick} layout="vertical" margin={{ left: 20 }}>
                      <YAxis
                        dataKey="name"
                        type="category"
                        tickLine={false}
                        tickMargin={10}
                        axisLine={false}
                        tickFormatter={(value) => value.length > 15 ? value.slice(0, 15) + '...' : value}
                        className="text-xs"
                      />
                      <XAxis dataKey="total" type="number" hide />
                      <RechartsTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                      <Bar dataKey="total" radius={5} onClick={(data) => handleTypeClick(data)}>
                         {incidentTypeData.map((entry) => (
                          <Cell 
                            key={`cell-${entry.name}`} 
                            fill={typeFilter === 'all' || typeFilter === entry.name ? "hsl(var(--chart-1))" : "hsl(var(--chart-1)/0.3)"}
                            className="cursor-pointer"
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
              </CardContent>
            </Card>
             <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center"><PieChartIcon className="mr-2 h-5 w-5 text-primary"/> Incidents by Status</CardTitle>
              </CardHeader>
              <CardContent>
                    <ChartContainer config={statusChartConfig} className="mx-auto aspect-square max-h-[250px]">
                      <PieChart>
                        <RechartsTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                        <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={60} strokeWidth={5} onClick={(data) => handleStatusClick(data)}>
                           {statusData.map((entry, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.fill}
                              className="cursor-pointer"
                              opacity={statusFilter === 'all' || statusFilter === entry.name ? 1 : 0.3}
                            />
                          ))}
                        </Pie>
                         <ChartLegend content={<ChartLegendContent nameKey="name" />} />
                      </PieChart>
                    </ChartContainer>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-muted/30">
            <div className="space-y-1">
              <label htmlFor="search" className="text-sm font-medium text-muted-foreground">Search Reports</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    id="search"
                    type="text"
                    placeholder="Search ID, keyword, location, assigned..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-1">
              <label htmlFor="statusFilter" className="text-sm font-medium text-muted-foreground">Filter by Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="statusFilter">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses.map((status) => (
                    <SelectItem key={status} value={status}>
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label htmlFor="typeFilter" className="text-sm font-medium text-muted-foreground">Filter by Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger id="typeFilter">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {incidentTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableCaption>
                A list of ${filteredReports.length} incident reports.
              </TableCaption>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-[100px]">Report ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Date Reported <Button variant="ghost" size="sm" className="ml-1 p-0 h-auto"><ArrowUpDown className="h-3 w-3" /></Button></TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReports.length > 0 ? (
                  filteredReports.map((report) => (
                    <TableRow key={report.id} className="hover:bg-muted/20">
                      <TableCell className="font-medium">{report.id}</TableCell>
                      <TableCell>{report.incidentType}</TableCell>
                      <TableCell>{report.location}</TableCell>
                      <TableCell>{format(parseISO(report.dateReported), "MMM d, yyyy HH:mm")}</TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(report.status)}>{report.status}</Badge>
                      </TableCell>
                       <TableCell>
                        {report.assignedTo ? (
                          <div className="flex items-center gap-1">
                            <UserCheck2 className="h-4 w-4 text-primary" /> 
                            <span className="text-xs">{report.assignedTo}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">N/A</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/admin/report/${report.id}`}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No reports match your current filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
    