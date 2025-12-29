import { formatPrice } from "@/lib/trade-detection";
import { Progress } from "@/components/ui/progress";
import type { AccountMarketSnapshot } from "@/lib/types";

interface AccountBandsProps {
  bands: AccountMarketSnapshot["bands"];
}

const bandConfig = {
  budget: {
    label: "Budget",
    description: "Entry-level accounts",
    color: "bg-chart-1",
  },
  mid: {
    label: "Mid-tier",
    description: "Moderate value accounts",
    color: "bg-chart-2",
  },
  high: {
    label: "High-tier",
    description: "Premium accounts",
    color: "bg-chart-3",
  },
  premium: {
    label: "Premium",
    description: "Top-tier accounts",
    color: "bg-chart-4",
  },
};

export function AccountBands({ bands }: AccountBandsProps) {
  const totalCount =
    bands.budget.count +
    bands.mid.count +
    bands.high.count +
    bands.premium.count;
  const maxCount = Math.max(
    bands.budget.count,
    bands.mid.count,
    bands.high.count,
    bands.premium.count,
    1
  );

  return (
    <div className="space-y-4">
      {(Object.keys(bandConfig) as Array<keyof typeof bandConfig>).map(
        (key) => {
          const config = bandConfig[key];
          const band = bands[key];
          const percentage = totalCount > 0 ? (band.count / maxCount) * 100 : 0;

          return (
            <div key={key} className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-medium text-foreground">
                    {config.label}
                  </span>
                  <span className="ml-2 text-sm text-muted-foreground">
                    ({band.count} listings)
                  </span>
                </div>
                <span className="font-medium text-foreground">
                  {formatPrice(band.median, "USD")}
                </span>
              </div>
              <Progress value={percentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{formatPrice(band.range[0], "USD")}</span>
                <span>{formatPrice(band.range[1], "USD")}</span>
              </div>
            </div>
          );
        }
      )}
    </div>
  );
}
