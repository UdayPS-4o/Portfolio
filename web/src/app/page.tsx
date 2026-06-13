import Preloader from "@/components/mythic/Preloader";
import Chrome from "@/components/mythic/Chrome";
import Nav from "@/components/mythic/Nav";
import Hero from "@/components/mythic/heroes/HeroSchematic";
import About from "@/components/mythic/About";
import Capabilities from "@/components/mythic/Capabilities";
import Experience from "@/components/mythic/Experience";
import Projects from "@/components/mythic/Projects";
import Skills from "@/components/mythic/Skills";
import Contact from "@/components/mythic/Contact";
import Footer from "@/components/mythic/Footer";
import CommandPalette from "@/components/mythic/CommandPalette";
import Terminal from "@/components/mythic/Terminal";

export default function Home() {
  return (
    <>
      <Preloader />
      <Chrome />
      <Nav />

      <main>
        <Hero />
        <About />
        <Capabilities />
        <Experience />
        <Projects />
        <Skills />
        <Contact />
      </main>

      <Footer />
      <CommandPalette />
      <Terminal />
    </>
  );
}
