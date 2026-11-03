import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export function create(data: Prisma.BugReportUncheckedCreateInput) {
  return prisma.bugReport.create({ data });
}

export function findById(id: string) {
  return prisma.bugReport.findUnique({ where: { id } });
}

export function list(skip: number, take: number) {
  return prisma.$transaction([
    prisma.bugReport.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take,
      include: {
        reporter: {
          select: { firstName: true, lastName: true, email: true, role: { select: { name: true } } },
        },
      },
    }),
    prisma.bugReport.count(),
  ]);
}
