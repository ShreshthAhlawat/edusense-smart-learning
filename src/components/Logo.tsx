import logo from "@/assets/edusense-logo.png.asset.json";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <img
      src={logo.url}
      alt="EduSense"
      className={"select-none " + className}
      draggable={false}
    />
  );
}
