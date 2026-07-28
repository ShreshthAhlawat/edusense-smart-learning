import dark from "@/assets/edusense-logo-dark.png.asset.json";
import light from "@/assets/edusense-logo-light.png.asset.json";
import { useTheme } from "@/lib/theme";

export function Logo({ className = "" }: { className?: string }) {
  const { theme } = useTheme();
  // Dark theme → use the "dark background" logo (white "Edu" + blue "Sense")
  // Light theme → use the transparent-background logo (black "Edu" + blue "Sense")
  const src = theme === "dark" ? dark.url : light.url;
  return (
    <img
      src={src}
      alt="EduSense"
      className={"select-none " + className}
      draggable={false}
    />
  );
}
