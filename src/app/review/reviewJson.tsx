"use client";

import { Button } from "~/components/ui/button";
import * as React from "react";
import { useRouter } from "next/navigation";

export function ReviewJson() {
  const router = useRouter();

  const handleReviewAndSubmit = () => {
    router.push('/review-submit');
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleReviewAndSubmit}
      className="w-full sm:w-auto"
    >
      Review & Submit
    </Button>
  );
}

export default ReviewJson;
