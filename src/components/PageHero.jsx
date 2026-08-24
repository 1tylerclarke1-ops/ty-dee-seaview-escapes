import { motion } from "framer-motion";

export default function PageHero({ eyebrow, title, subtitle }) {
  return (
    <section className="pt-40 md:pt-48 pb-16 md:pb-24 px-6 md:px-10 max-w-[1400px] mx-auto">
      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="eyebrow"
      >
        {eyebrow}
      </motion.p>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="font-display text-5xl md:text-7xl lg:text-8xl text-atlantic mt-4 leading-[0.95]"
      >
        {title}
      </motion.h1>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="font-display italic text-2xl md:text-3xl text-cornish-slate mt-6 max-w-2xl"
        >
          {subtitle}
        </motion.p>
      )}
    </section>
  );
}