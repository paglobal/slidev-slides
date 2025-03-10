<script setup lang="ts">
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/range/range.js";
import "@shoelace-style/shoelace/dist/components/checkbox/checkbox.js";
import { CartPoleSystem, CartPoleVisuals, Impulse } from "./cart-pole";
import { onMounted, reactive, ref, useTemplateRef, watch } from "vue";
import { FIS } from "./fis";
import { LinguisticVariable } from "./linguistic-variable";
import { Term } from "./term";
import { Rule } from "./rule";
import { SlDialog } from "@shoelace-style/shoelace";
import Chart from "chart.js/auto";

type FuzzyRule = `IF ${string} IS ${string} THEN ${string} IS ${string}`;
type ControlPoints = [number, number, number, number];
type PremiseOrConsequenceSet = Array<{
  name: string;
  range: [number, number];
  active: boolean;
  membershipFunctions: Array<{
    name: string;
    controlPoints: ControlPoints;
  }>;
}>;
type KnowledgeBase = {
  premiseSet: PremiseOrConsequenceSet;
  fuzzyRules: string;
  consequenceSet: PremiseOrConsequenceSet;
};

const knowledgeBase: KnowledgeBase = reactive({
  premiseSet: [
    {
      name: "PoleAngularDisplacement",
      range: [-Math.PI, Math.PI],
      active: false,
      membershipFunctions: [
        { name: "Negative", controlPoints: [0, 0, 0, 0] },
        { name: "Positive", controlPoints: [0, 0, 0, 0] },
      ],
    },
    {
      name: "PoleAngularVelocity",
      range: [-5, 5],
      active: false,
      membershipFunctions: [
        { name: "Negative", controlPoints: [0, 0, 0, 0] },
        { name: "Positive", controlPoints: [0, 0, 0, 0] },
      ],
    },
    {
      name: "CartDisplacement",
      range: [-100, 100],
      active: false,
      membershipFunctions: [
        { name: "Negative", controlPoints: [0, 0, 0, 0] },
        { name: "Positive", controlPoints: [0, 0, 0, 0] },
      ],
    },
    {
      name: "CartVelocity",
      range: [-5, 5],
      active: false,
      membershipFunctions: [
        { name: "Negative", controlPoints: [0, 0, 0, 0] },
        { name: "Positive", controlPoints: [0, 0, 0, 0] },
      ],
    },
  ],
  consequenceSet: [
    {
      name: "Force",
      range: [-20, 20],
      active: true,
      membershipFunctions: [
        { name: "NL", controlPoints: [0, 0, 0, 0] },
        { name: "NM", controlPoints: [0, 0, 0, 0] },
        { name: "NS", controlPoints: [0, 0, 0, 0] },
        { name: "PS", controlPoints: [0, 0, 0, 0] },
        { name: "PM", controlPoints: [0, 0, 0, 0] },
        { name: "PL", controlPoints: [0, 0, 0, 0] },
      ],
    },
  ],
  fuzzyRules: "",
});

function getNewFISSystem() {
  const system = new FIS("Cart Pole System");
  knowledgeBase.premiseSet.forEach((linguisticVariable) => {
    if (linguisticVariable.active) {
      const LINVAR = new LinguisticVariable(
        linguisticVariable.name,
        linguisticVariable.range
      );
      system.addInput(LINVAR);
      linguisticVariable.membershipFunctions.forEach((term) => {
        LINVAR.addTerm(new Term(term.name, "trapeze", term.controlPoints));
      });
    }
  });
  knowledgeBase.consequenceSet.forEach((linguisticVariable) => {
    if (linguisticVariable.active) {
      const LINVAR = new LinguisticVariable(
        linguisticVariable.name,
        linguisticVariable.range
      );
      system.addOutput(LINVAR);
      linguisticVariable.membershipFunctions.forEach((term) => {
        LINVAR.addTerm(new Term(term.name, "trapeze", term.controlPoints));
      });
    }
  });
  system.rules = knowledgeBase.fuzzyRules.split("\n").map((rule) => {
    const splitRule = rule.split(" THEN ");
    const premisePart = splitRule[0].replace("IF ", "").split(" IS ");
    const consequencePart = splitRule[1].split(" IS ");
    if (premisePart[0] === "PoleAngularDisplacement") {
      return new Rule(
        [premisePart[1], null, null, null],
        [consequencePart[1]],
        "and"
      );
    } else if (premisePart[0] === "PoleAngularVelocity") {
      return new Rule(
        [null, premisePart[1], null, null],
        [consequencePart[1]],
        "and"
      );
    } else if (premisePart[0] === "CartDisplacement") {
      return new Rule(
        [null, null, premisePart[1], null],
        [consequencePart[1]],
        "and"
      );
    } else {
      return new Rule(
        [null, null, null, premisePart[1]],
        [consequencePart[1]],
        "and"
      );
    }
  });

  return system;
}

const InFISSession = ref(false);
const simulationRunning = ref(false);
const FISActive = ref(true);
watch(InFISSession, () => {
  setTimeout(() => {
    const poleLength = 100;
    const cartPoleSystem = new CartPoleSystem({
      poleLength,
      poleMass: 0.2,
      cartMass: 0.5,
      accelerationDueToGravity: 9.8,
      poleImpulseFactor: 2,
      cartImpulseFactor: 2,
      poleDampeningFactor: 1,
      cartDampeningFactor: 1,
    });
    const cartPoleVisuals = new CartPoleVisuals({
      cartWidth: 100,
      cartHeight: 70,
      poleLength,
    });
    const cartPoleSystemSimulationGenerator = cartPoleSystem.simulate();
    cartPoleSystemSimulationGenerator.next();
    cartPoleSystemSimulationGenerator.next({ force: 2, time: 1 });
    const fisSystem = getNewFISSystem();
    let currentForce: number = 0;
    setInterval(() => {
      let currentImpulse: Impulse | undefined;
      if (FISActive.value) {
        console.log(currentForce);
        currentImpulse = { force: currentForce / 15, time: 1 };
      }
      const newStateIteratorResult =
        cartPoleSystemSimulationGenerator.next(currentImpulse);
      if (newStateIteratorResult.value) {
        cartPoleVisuals.updateState(newStateIteratorResult.value);
        currentForce = fisSystem.getPreciseOutput([
          newStateIteratorResult.value.poleAngularDisplacement,
          newStateIteratorResult.value.poleAngularVelocity,
          newStateIteratorResult.value.cartDisplacement,
          newStateIteratorResult.value.cartVelocity,
        ])[0];
      }
      cartPoleVisuals.drawVisuals();
    }, 50);
  });
});

let chart: Chart | undefined;
function updateChart(
  membershipFunction: PremiseOrConsequenceSet[number]["membershipFunctions"][number]
) {
  if (chart) {
    chart.data.datasets[0].label = membershipFunction.name;
    chart.data.datasets[0].data = [
      { x: membershipFunction.controlPoints[0], y: 0 },
      { x: membershipFunction.controlPoints[1], y: 1 },
      { x: membershipFunction.controlPoints[2], y: 1 },
      { x: membershipFunction.controlPoints[3], y: 0 },
    ];
    dialog?.value?.show();
    chart.update();
  }
}
onMounted(() => {
  const ctx = document.getElementById("membership-charts") as HTMLCanvasElement;
  const data = {
    datasets: [
      {
        label: "Scatter Dataset",
        data: [
          {
            x: -10,
            y: 0,
          },
          {
            x: 0,
            y: 10,
          },
          {
            x: 10,
            y: 5,
          },
          {
            x: 0.5,
            y: 5.5,
          },
        ],
        backgroundColor: "rgb(75, 192, 192)",
        showLine: true,
        borderColor: "rgb(75, 192, 192)",
      },
    ],
  };
  chart = new Chart(ctx, {
    type: "scatter",
    data: data,
    options: {
      scales: {
        x: {
          type: "linear",
          position: "bottom",
        },
      },
    },
  });
});

const dialog = useTemplateRef<SlDialog>("my-dialog");
</script>
<template>
  <sl-dialog label="Membership Functions" ref="my-dialog" style="--width: 50vw">
    <div>
      <canvas id="membership-charts"></canvas>
    </div>
  </sl-dialog>
  <div
    v-if="!InFISSession"
    class="flex flex-col w-full h-full -mt-2 overflow-y-scroll"
  >
    <span class="text-[24px]">Premise Set</span>
    <template v-for="linguisticVariable in knowledgeBase.premiseSet">
      <span class="text-[#5d8392]">
        {{ linguisticVariable.name }}
      </span>
      <sl-checkbox
        :checked="linguisticVariable.active"
        @sl-input="linguisticVariable.active = Boolean($event.target.checked)"
      ></sl-checkbox>
      <template
        v-for="membershipFunction in linguisticVariable.membershipFunctions"
        v-if="linguisticVariable.active"
      >
        <span @click="updateChart(membershipFunction)">
          {{ membershipFunction.name }}</span
        >
        <sl-range
          v-for="(controlPoint, index) in membershipFunction.controlPoints"
          :min="linguisticVariable.range[0]"
          :max="linguisticVariable.range[1]"
          step="0.01"
          :value="controlPoint"
          @sl-input="
            membershipFunction.controlPoints[index] = Number(
              $event.target.value
            )
          "
        ></sl-range>
      </template>
    </template>
    <span class="text-[24px]">Consequence Set</span>
    <template v-for="linguisticVariable in knowledgeBase.consequenceSet">
      <span class="text-[#5d8392]"> {{ linguisticVariable.name }} </span>

      <template
        v-for="membershipFunction in linguisticVariable.membershipFunctions"
      >
        <span @click="updateChart(membershipFunction)">
          {{ membershipFunction.name }}</span
        >
        <sl-range
          v-for="(controlPoint, index) in membershipFunction.controlPoints"
          :min="linguisticVariable.range[0]"
          :max="linguisticVariable.range[1]"
          step="0.01"
          :value="controlPoint"
          @sl-input="
            membershipFunction.controlPoints[index] = Number(
              $event.target.value
            )
          "
        ></sl-range>
      </template>
    </template>
    <sl-textarea
      label="Fuzzy Rules"
      :value="knowledgeBase.fuzzyRules"
      @sl-input="knowledgeBase.fuzzyRules = $event.target.value"
    ></sl-textarea>
    <sl-button variant="primary" @click="InFISSession = true" class="py-8"
      >Start Simulation</sl-button
    >
  </div>
  <div v-else class="flex flex-col w-full h-full -mt-2">
    <canvas
      id="simulation-canvas"
      style="width: 850px; height: 400px; background-color: black"
    ></canvas>
    <div class="flex gap-2 w-full h-full py-3">
      <sl-button variant="primary" @click="">Apply Positive Impulse</sl-button
      ><sl-button variant="primary" @click="">Apply Negative Impulse</sl-button>
      <sl-button variant="primary" @click="FISActive = !FISActive">{{
        FISActive ? "Deactivate FIS" : "Activate FIS"
      }}</sl-button>
      <sl-button
        variant="primary"
        @click="
          InFISSession = false;
          simulationRunning = false;
        "
        >Exit Simulation</sl-button
      >
    </div>
  </div>
</template>
