---
title: My one-person software factory
date: 2026-10-22
tags: AI, Building
linkedin: https://www.linkedin.com/feed/update/urn:li:activity:7518914039301865472/
---
118 story points in 3 days. My original sprint plan had spread them over 6 sprints.

That came from my habit-tracker app, built mostly by a coding agent. But the agent was only one station. What made it work was the loop around it. At AI Engineer Paris last month, people kept calling that loop a software factory.

Mine is small: one person, nine stations.

An idea gets grilled before it becomes an intent file. Then a spec, then a plan I approve before any code is written. The agent builds with a CLAUDE.md that remembers its past mistakes, and with hooks that block what must never happen. A separate agent verifies the work, another reviews it, and I approve. Incidents become the next intent.

The line I heard most in Paris: "Everyone has agents. Nobody has orchestration."

The factory is the orchestration.

I've open-sourced my setup as a template you can drop into a repo: skills, hooks, subagents, the templates and one worked example.

One honest caveat: 3 days against 6 sprints is calendar time against a plan, not a lab experiment. The method is open too.

![Diagram titled "My one-person software factory": nine stations in a loop, from Signal and Grill through Intent, Spec, Plan, Build, Verify, Review and Ship to Observe and measure. Signal and Grill, Plan and Review are highlighted as the steps where I stay in the loop.](/assets/posts/one-person-software-factory/1.jpg)

Part 2 of 3.

Where does work pile up in your delivery chain now that code is fast?

---

The template: https://github.com/jintomjose/mini-software-factory
How I measure delivery against the plan: https://github.com/jintomjose/agentic-benchmarks
Part 1, the research behind it: https://github.com/jintomjose/ai-native-sdlc-playbooks
My Paris notes: https://github.com/jintomjose/AI-Engineer-Paris-2026
