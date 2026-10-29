import { ReactNode } from "react";
import { Link, LinkProps } from "react-router-dom";

interface ButtonProps {
  children: ReactNode;
  type?: "button" | "submit" | "reset";
  variant?:
    | "primary"
    | "secondary"
    | "danger"
    | "success"
    | "outline"
    | "ghost";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  className?: string;
  onClick?: () => void;
}

interface ButtonLinkProps extends LinkProps {
  children: ReactNode;
  variant?:
    | "primary"
    | "secondary"
    | "danger"
    | "success"
    | "outline"
    | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  icon?: ReactNode;
  className?: string;
}

const baseClasses =
  "inline-flex flex-row items-center justify-center gap-2 rounded-xl font-bold transition-all duration-200 select-none whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98]";

const variantClasses = {
  primary:
    "bg-[#4f7754] text-white shadow-sm hover:bg-[#385e3e] hover:shadow-md focus-visible:ring-[#4f7754]",

  secondary:
    "bg-[#e8efe2] text-[#385e3e] shadow-sm hover:bg-[#dce7d5] focus-visible:ring-[#8da68a]",

  danger:
    "bg-red-600 text-white shadow-sm hover:bg-red-700 hover:shadow-md focus-visible:ring-red-500",

  success:
    "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 hover:shadow-md focus-visible:ring-emerald-500",

  outline:
    "border border-[#dce5d7] bg-white text-[#385e3e] shadow-sm hover:border-[#a8bea1] hover:bg-[#faf9f4] hover:shadow-md focus-visible:ring-[#8da68a]",

  ghost:
    "bg-transparent text-[#4b5f4a] hover:bg-[#e8efe2] focus-visible:ring-[#8da68a]",
};

const sizeClasses = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-3 text-sm",
  lg: "px-6 py-3.5 text-base",
};

function Spinner() {
  return (
    <span
      className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />
  );
}

export default function Button({
  children,
  type = "button",
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  icon,
  className = "",
  onClick,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      aria-busy={loading || undefined}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? "w-full" : ""}
        ${
          isDisabled
            ? "cursor-not-allowed opacity-60 active:scale-100"
            : "cursor-pointer"
        }
        ${className}
      `}
    >
      {loading ? (
        <Spinner />
      ) : (
        icon && (
          <span className="shrink-0" aria-hidden="true">
            {icon}
          </span>
        )
      )}

      <span className="inline-flex flex-row items-center gap-2 whitespace-nowrap">
        {children}
      </span>
    </button>
  );
}

export function ButtonLink({
  children,
  variant = "primary",
  size = "md",
  fullWidth = false,
  icon,
  className = "",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      {...props}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? "w-full" : ""}
        ${className}
      `}
    >
      <span className="inline-flex flex-row items-center gap-2 whitespace-nowrap">
        {children}
      </span>

      {icon && (
        <span className="shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
    </Link>
  );
}
