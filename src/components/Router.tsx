import { BrowserRouter, Routes, Route } from "react-router-dom";
import Navigation from "./Navigation";
import HomePage from "../pages/Home";
import MagickPage from "../pages/Magick";
import SkiaPage from "../pages/Skia";

export default function Router() {
  return (
    <BrowserRouter>
      <Navigation />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/magick" element={<MagickPage />} />
        <Route path="/skia" element={<SkiaPage />} />
      </Routes>
    </BrowserRouter>
  );
}
