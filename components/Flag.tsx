import Flag from "react-world-flags";

interface CountryFlagProps {
  code: string;
  width?: number;
}

export function CountryFlag({
  code,
  width = 25,
}: CountryFlagProps) {
  return (
    <Flag
      code={code}
      width={width}
      height={20}
    />
  );
}