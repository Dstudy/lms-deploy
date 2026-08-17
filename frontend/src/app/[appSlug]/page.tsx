import { Suspense } from "react";
import AppStudentPage from "./student-page";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AppStudentPage />
    </Suspense>
  );
}
