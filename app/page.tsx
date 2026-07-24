import { Chassis, Chin } from "@/components/chrome/Chassis";
import { Screen } from "@/components/chrome/Screen";
import { Planner } from "@/components/planner/Planner";

export default function Home() {
  const weekLabel = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <Chassis>
      <Screen>
        <Planner />
      </Screen>
      <Chin>WEEK OF {weekLabel.toUpperCase()}</Chin>
    </Chassis>
  );
}
