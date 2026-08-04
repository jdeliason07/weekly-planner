import { Chassis, Chin } from "@/components/chrome/Chassis";
import { Screen } from "@/components/chrome/Screen";
import { Planner } from "@/components/planner/Planner";
import { WeekLabel } from "@/components/chrome/WeekLabel";

export default function Home() {
  return (
    <Chassis>
      <Screen>
        <Planner />
      </Screen>
      <Chin>
        <WeekLabel />
      </Chin>
    </Chassis>
  );
}
