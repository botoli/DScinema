"use client";
import Link from "next/link";
import styles from "./ChooseProfile.module.css";
import { motion } from "motion/react";
import { cardReveal, curtainReveal, staggerContainer, tactile } from "../lib/motion";
export default function ChooseProfile() {
  const users = [
    { id: "dzhebra", name: "Джебра" },
    { id: "artem", name: "Артём" },
    { id: "andrey", name: "Андрей" },
    { id: "misha", name: "Миша" },
  ];
  function saveMe(name: string) {
    localStorage.removeItem("me");
    localStorage.setItem("me", name);
  }
  return (
    <div className={styles.page}>
      <motion.div className={styles.header} initial="hidden" animate="visible" variants={curtainReveal}>
        <h1>Выбор Профиля</h1>
        <p>Выбери себя</p>
      </motion.div>
      <motion.div className={styles.split} initial="hidden" animate="visible" variants={staggerContainer(0.1)}>
        {users.map((u, idx) => (
          <motion.div className={styles.pane} key={u.id} style={{"--i": idx} as React.CSSProperties} variants={cardReveal} {...tactile}>
            <h2>{u.name}</h2>
            <p>Присоединиться к существующей сессии и предлагать свои фильмы</p>
            <Link href={`/member/${encodeURIComponent(u.id)}`}>
              <button
                onClick={() => saveMe(u.id)}
              >{`Войти как ${u.name}`}</button>
            </Link>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
