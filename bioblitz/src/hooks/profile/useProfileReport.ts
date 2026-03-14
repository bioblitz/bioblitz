"use client";

import { useState } from "react";

interface UseProfileReportParams {
  reportedUser: string;
  reporterUser: string;
}

export function useProfileReport({ reportedUser, reporterUser }: UseProfileReportParams) {
  const [reporting, setReporting] = useState(false);
  const [reportCategory, setReportCategory] = useState("Inappropriate Content");
  const [reportDescription, setReportDescription] = useState("");
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);

  const REPORT_CATEGORIES = [
    "Inappropriate Content",
    "Harassment/Bullying",
    "Spam or Bot",
    "Cheating",
    "Offensive Username/Bio",
    "Other",
  ];

  const handleReportSubmit = async () => {
    if (!reportDescription.trim()) {
      alert("Please add a description.");
      return;
    }

    setIsSubmittingReport(true);
    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportedUser,
          reporterUser,
          category: reportCategory,
          description: reportDescription,
          url: window.location.href,
        }),
      });

      if (response.ok) {
        setReportSuccess(true);
        setTimeout(() => {
          setReporting(false);
          setReportSuccess(false);
          setReportDescription("");
        }, 2500);
      } else {
        alert("Failed to send report.");
      }
    } catch (e) {
      console.error(e);
      alert("Error sending report.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  return {
    reporting,
    setReporting,
    reportCategory,
    setReportCategory,
    reportDescription,
    setReportDescription,
    isSubmittingReport,
    reportSuccess,
    REPORT_CATEGORIES,
    handleReportSubmit,
  };
}
