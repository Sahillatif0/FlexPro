"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StudentMark {
    assignment1: number;
    assignment2: number;
    quiz1: number;
    quiz2: number;
    quiz3: number;
    quiz4: number;
    mid1: number;
    mid2: number;
    finalExam: number;
    graceMarks: number;
    total: number;
}

interface MarkStats {
    min: number;
    max: number;
    avg: number;
}

interface CourseStats {
    assignment1: MarkStats;
    assignment2: MarkStats;
    quiz1: MarkStats;
    quiz2: MarkStats;
    quiz3: MarkStats;
    quiz4: MarkStats;
    mid1: MarkStats;
    mid2: MarkStats;
    finalExam: MarkStats;
    graceMarks: MarkStats;
    total: MarkStats;
}

interface CourseMarks {
    courseCode: string;
    courseTitle: string;
    termName: string;
    marks: StudentMark | null;
    stats: CourseStats;
}

export default function StudentMarksPage() {
    const [marksData, setMarksData] = useState<CourseMarks[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function loadMarks() {
            try {
                const response = await fetch("/api/student/marks");
                if (response.ok) {
                    const payload = await response.json();
                    setMarksData(payload.marks);
                }
            } catch (error) {
                console.error("Failed to load marks", error);
            } finally {
                setIsLoading(false);
            }
        }

        loadMarks();
    }, []);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <h1 className="text-2xl font-semibold text-white">My Marks</h1>
                {Array.from({ length: 3 }).map((_, i) => (
                    <Skeleton key={i} className="h-40 bg-gray-800" />
                ))}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-semibold text-white">My Marks</h1>
                <p className="text-sm text-gray-400">
                    View your detailed marks breakdown and class statistics.
                </p>
            </div>

            {marksData.length === 0 ? (
                <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="p-6 text-center text-gray-400">
                        No marks available yet.
                    </CardContent>
                </Card>
            ) : (
                <Tabs defaultValue={marksData[0]?.courseCode} className="w-full">
                    <TabsList className="bg-gray-900 border border-gray-800">
                        {marksData.map((course) => (
                            <TabsTrigger
                                key={course.courseCode}
                                value={course.courseCode}
                                className="data-[state=active]:bg-gray-800 data-[state=active]:text-white text-gray-400"
                            >
                                {course.courseCode}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {marksData.map((item) => (
                        <TabsContent key={item.courseCode} value={item.courseCode} className="mt-6">
                            <Card className="bg-gray-900 border-gray-800 overflow-hidden">
                                <CardHeader className="bg-gray-800/50 border-b border-gray-800">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <CardTitle className="text-white text-lg">
                                                {item.courseCode} · {item.courseTitle}
                                            </CardTitle>
                                            <p className="text-sm text-gray-400 mt-1">{item.termName}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-sm text-gray-400">Total Score</p>
                                            <p className="text-2xl font-bold text-emerald-400">
                                                {item.marks?.total.toFixed(2) ?? "0.00"}
                                                <span className="text-sm text-gray-500 font-normal"> / 100</span>
                                            </p>
                                            {item.marks?.graceMarks ? (
                                                <p className="text-xs text-emerald-400/70 mt-1">
                                                    (includes {item.marks.graceMarks.toFixed(2)} grace marks)
                                                </p>
                                            ) : null}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow className="border-gray-800 hover:bg-transparent">
                                                    <TableHead className="text-gray-400">Assessment</TableHead>
                                                    <TableHead className="text-gray-400 text-right">Weightage</TableHead>
                                                    <TableHead className="text-gray-400 text-right">Obtained</TableHead>
                                                    <TableHead className="text-gray-400 text-right text-xs uppercase tracking-wider">Min</TableHead>
                                                    <TableHead className="text-gray-400 text-right text-xs uppercase tracking-wider">Max</TableHead>
                                                    <TableHead className="text-gray-400 text-right text-xs uppercase tracking-wider">Avg</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {[
                                                    { label: "Assignment 1", key: "assignment1", max: 5 },
                                                    { label: "Assignment 2", key: "assignment2", max: 5 },
                                                    { label: "Quiz 1", key: "quiz1", max: 2.5 },
                                                    { label: "Quiz 2", key: "quiz2", max: 2.5 },
                                                    { label: "Quiz 3", key: "quiz3", max: 2.5 },
                                                    { label: "Quiz 4", key: "quiz4", max: 2.5 },
                                                    { label: "Midterm 1", key: "mid1", max: 15 },
                                                    { label: "Midterm 2", key: "mid2", max: 15 },
                                                    { label: "Final Exam", key: "finalExam", max: 50 },
                                                ].map((row, i) => {
                                                    const field = row.key as keyof StudentMark;
                                                    const stats = item.stats[field as keyof CourseStats];
                                                    const value = item.marks?.[field];

                                                    return (
                                                        <TableRow key={i} className="border-gray-800 hover:bg-gray-800/30">
                                                            <TableCell className="text-gray-300">{row.label}</TableCell>
                                                            <TableCell className="text-gray-400 text-right">{row.max}</TableCell>
                                                            <TableCell className="text-white font-medium text-right">
                                                                {value !== undefined ? value.toFixed(2) : "-"}
                                                            </TableCell>
                                                            <TableCell className="text-gray-500 text-right text-xs">
                                                                {stats?.min.toFixed(2) ?? "-"}
                                                            </TableCell>
                                                            <TableCell className="text-gray-500 text-right text-xs">
                                                                {stats?.max.toFixed(2) ?? "-"}
                                                            </TableCell>
                                                            <TableCell className="text-gray-500 text-right text-xs">
                                                                {stats?.avg.toFixed(2) ?? "-"}
                                                            </TableCell>
                                                        </TableRow>
                                                    );
                                                })}
                                            </TableBody>
                                        </Table>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    ))}
                </Tabs>
            )}
        </div>
    );
}
