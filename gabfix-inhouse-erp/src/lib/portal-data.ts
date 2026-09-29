export type Role = "Technician" | "Sales" | "Supervisor" | "Accountant-field";
export type JobStatus = "Scheduled" | "Started" | "Completed" | "Invoiced";
export type Job = {
  id: string;
  title: string;
  customer: string;
  location: string;
  time: string;
  status: JobStatus;
  priority: "High" | "Normal";
  value: string;
  crew: string;
};

export const jobs: Job[] = [
  {
    id: "GF-2841",
    title: "Kitchen tap replacement",
    customer: "Sarah Nanyonga",
    location: "Muyenga, Kampala",
    time: "09:00",
    status: "Started",
    priority: "High",
    value: "UGX 285K",
    crew: "Field Crew A",
  },
  {
    id: "GF-2846",
    title: "Bathroom inspection",
    customer: "Mark Kato",
    location: "Ntinda, Kampala",
    time: "12:30",
    status: "Scheduled",
    priority: "Normal",
    value: "UGX 120K",
    crew: "Field Crew A",
  },
  {
    id: "GF-2852",
    title: "Water heater service",
    customer: "Acacia Residences",
    location: "Kololo, Kampala",
    time: "15:00",
    status: "Scheduled",
    priority: "Normal",
    value: "UGX 640K",
    crew: "Field Crew B",
  },
  {
    id: "GF-2833",
    title: "Drainage repair",
    customer: "Nile Avenue Offices",
    location: "Central Kampala",
    time: "Yesterday",
    status: "Completed",
    priority: "High",
    value: "UGX 950K",
    crew: "Field Crew A",
  },
];

export const roleCopy: Record<Role, { eyebrow: string; title: string; subtitle: string }> = {
  Technician: {
    eyebrow: "Monday, 28 September",
    title: "Good afternoon, Daniel",
    subtitle: "You have three jobs scheduled today. One needs attention.",
  },
  Sales: {
    eyebrow: "Sales workspace",
    title: "Your pipeline is moving",
    subtitle: "Two quotes need follow-up before the end of the day.",
  },
  Supervisor: {
    eyebrow: "Field Crew A",
    title: "Crew day overview",
    subtitle: "Six technicians are active across four customer sites.",
  },
  "Accountant-field": {
    eyebrow: "Field costs",
    title: "Capture today's expenses",
    subtitle: "Submit direct job costs and sales expenses for approval.",
  },
};
