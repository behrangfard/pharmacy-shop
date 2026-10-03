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
  "inline-flex flex-row items-center justify-center gap-2 font-bold rounded-xl transition-all duration-200 select-none whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-offset-2 active:scale-95";

const variantClasses = {
  primary:
    "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500 shadow-sm hover:shadow-md",

  secondary:
    "bg-gray-100 text-gray-800 hover:bg-gray-200 focus:ring-gray-400 shadow-sm hover:shadow-md",

  danger:
    "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 shadow-sm hover:shadow-md",

  success:
    "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 shadow-sm hover:shadow-md",

  outline:
    "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 focus:ring-gray-400 shadow-sm hover:shadow-md",

  ghost: "bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-400",
};

const sizeClasses = {
  sm: "px-4 py-2 text-sm",
  md: "px-5 py-3 text-sm",
  lg: "px-6 py-3.5 text-base",
};

function Spinner() {
  return (
    <span
      className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0"
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
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${fullWidth ? "w-full" : ""}
        ${
          isDisabled
            ? "opacity-60 cursor-not-allowed hover:translate-y-0 active:scale-100"
            : "cursor-pointer"
        }
        ${className}
      `}
    >
      {loading ? (
        <Spinner />
      ) : (
        icon && (
          <span className="shrink-0 transition-transform duration-200">
            {icon}
          </span>
        )
      )}

      <span className="inline-flex flex-row items-center gap-2 whitespace-nowrap transition-transform duration-200">
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
        <span className="shrink-0 transition-transform duration-200">
          {icon}
        </span>
      )}
    </Link>
  );
}
