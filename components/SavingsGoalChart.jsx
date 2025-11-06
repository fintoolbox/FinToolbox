import ClientOnly from "@/components/ClientOnly";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip as RTooltip,
  Legend,
} from "recharts";

/**
 * SavingsGoalChart
 * - Renders a simple savings vs target projection as an area chart.
 * - You can pass a custom "data" prop (array of { month, balance, target }).
 * - If no data is provided, it falls back to a sensible default that matches the article.
 */
export default function SavingsGoalChart({
  data = [
    { month: "Start", balance: 1200, target: 8000 },
    { month: "Mar",   balance: 2600, target: 8000 },
    { month: "Jun",   balance: 4300, target: 8000 },
    { month: "Sep",   balance: 6100, target: 8000 },
    { month: "Dec",   balance: 8000, target: 8000 },
  ],
  height = 300,
}) {
  return (
    <ClientOnly>
      <div className="w-full rounded-2xl border border-gray-200 bg-white p-3 shadow-sm">
        <div className="text-sm text-gray-600 mb-2">Savings balance vs target</div>
        <ResponsiveContainer width="100%" height={height}>
          <AreaChart data={data} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="month" />
            <YAxis />
            <RTooltip />
            <Legend />
            <Area
              type="monotone"
              dataKey="balance"
              name="Savings balance"
              stroke="#3b82f6"       /* Tailwind blue-500 */
              fill="#3b82f6"
              fillOpacity={0.25}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="target"
              name="Target goal"
              stroke="#10b981"       /* Tailwind emerald-500 */
              fill="#10b981"
              fillOpacity={0.12}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </ClientOnly>
  );
}
