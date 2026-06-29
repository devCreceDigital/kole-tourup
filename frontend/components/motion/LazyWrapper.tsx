'use client'
import { LazyMotion, domAnimation, m } from 'framer-motion'
import React from 'react'

interface LazyWrapperProps {
  children: React.ReactNode
  className?: string
  initial?: object
  animate?: object
  transition?: object
}

export function LazyWrapper({ children, className, initial = { opacity: 0, y: 8 }, animate = { opacity: 1, y: 0 }, transition = { duration: 0.3 } }: LazyWrapperProps) {
  return (
    <LazyMotion features={domAnimation}>
      <m.div className={className} initial={initial} animate={animate} transition={transition}>
        {children}
      </m.div>
    </LazyMotion>
  )
}