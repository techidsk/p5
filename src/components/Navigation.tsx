"use client";

import { Link, useLocation } from "react-router-dom";
import { routes } from "../config/routes";
import { RouteConfig } from "../config/routes";

export default function Navigation() {
  const { pathname } = useLocation();

  return (
    <nav className="flex space-x-4 p-4">
      {routes.map((route: RouteConfig) => (
        <Link
          key={route.path}
          to={route.path}
          className={`px-4 py-2 rounded-md ${
            pathname === route.path
              ? "bg-blue-500 text-white"
              : "hover:bg-gray-100"
          }`}
        >
          {route.label}
        </Link>
      ))}
    </nav>
  );
}
