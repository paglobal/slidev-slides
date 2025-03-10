<script setup lang="ts">
import { computed, reactive, ref, watch, watchEffect } from "vue";
import "@shoelace-style/shoelace/dist/components/icon-button/icon-button.js";
import "@shoelace-style/shoelace/dist/components/button/button.js";
import "@shoelace-style/shoelace/dist/components/input/input.js";
import "@shoelace-style/shoelace/dist/components/card/card.js";
import { GASolver, PossibleSolution, ProblemSet } from "./ga";

const inputs = reactive({
  problemSetSize: { placeholder: "Problem Set Size", value: 10 },
  probabilityOfCrossover: {
    placeholder: "Probability Of Crossover",
    value: 0.4,
  },
  probabilityOfMutation: {
    placeholder: "Probability Of Mutation",
    value: 0.1,
  },
  populationSize: { placeholder: "Population Size", value: 5 },
  numberOfGenerations: {
    placeholder: "Number Of Generations",
    value: 10,
  },
  elitism: { placeholder: "Elitism", value: 1 },
  tournamentRoundSize: {
    placeholder: "Tournament Round Size",
    value: 2,
  },
});
const defaultCardContent = [] as Array<PossibleSolution>;
const cards = reactive({
  currentGeneration: {
    header: "Current Generation",
    content: defaultCardContent,
  },
  currentParents: { header: "Current Parents", content: defaultCardContent },
  currentChildren: { header: "Current Children", content: defaultCardContent },
  currentCompetitors: {
    header: "Current Competitors",
    content: defaultCardContent,
  },
  nextGeneration: { header: "Next Generation", content: defaultCardContent },
});
const buttons = [
  {
    icon: computed(() => (GAPlaying.value ? "pause-circle" : "play-circle")),
    onClick() {
      GAPlaying.value ? (GAPlaying.value = false) : (GAPlaying.value = true);
    },
  },
  {
    icon: "rewind-circle",
    onClick() {
      GAStepTimeInterval.value = GAStepTimeInterval.value * 2;
    },
  },
  {
    icon: "fast-forward-circle",
    onClick() {
      GAStepTimeInterval.value = GAStepTimeInterval.value / 2;
    },
  },
  {
    icon: "x-circle",
    onClick() {
      InGASession.value = false;
    },
  },
];

const problemSet = computed(() => {
  const problemSet: ProblemSet = [];
  for (let i = 0; i < inputs.problemSetSize.value; i++) {
    const weight = Math.floor(Math.random() * 50);
    const value = Math.floor(Math.random() * 50);
    problemSet.push({ weight, value });
  }

  return problemSet;
});
const MAX_WEIGHT = computed(() => {
  return problemSet.value.reduce(
    (accumulator, currentValue) => accumulator + currentValue.weight,
    0
  );
});
const OPTIMUM_FITNESS = computed(() => {
  return problemSet.value.reduce(
    (accumulator, currentValue) => accumulator + currentValue.value,
    0
  );
});

const InGASession = ref(false);
const GAPlaying = ref(false);
const GAStepTimeInterval = ref(1);
const GAStatusMessage = ref("");
const GAErrorMessage = ref("");

let knapsackSolver: GASolver | null = null;
let knapsackSolutionGenerator: ReturnType<GASolver["solve"]> | null = null;
watch(InGASession, () => {
  knapsackSolutionGenerator?.return({
    fitness: MAX_WEIGHT.value,
    bits: Array(inputs.problemSetSize.value).fill(1),
  } as PossibleSolution);
  knapsackSolutionGenerator = null;
  knapsackSolver = null;
  GAStatusMessage.value = "";
  cards.currentGeneration.content = [];
  cards.currentParents.content = [];
  cards.currentChildren.content = [];
  cards.currentCompetitors.content = [];
  cards.nextGeneration.content = [];
  GAErrorMessage.value = "";
  GAPlaying.value = false;
  if (InGASession) {
    try {
      const fitnessFunction = (
        possibleSolutionBits: PossibleSolution["bits"]
      ) =>
        possibleSolutionBits.reduce(
          (accumulator, currentValue, currentIndex) =>
            accumulator +
            (currentValue === 0 ? 0 : problemSet.value[currentIndex].weight),
          0 as number
        ) > MAX_WEIGHT.value
          ? 0
          : possibleSolutionBits.reduce(
              (accumulator, currentValue, currentIndex) =>
                accumulator +
                (currentValue === 0 ? 0 : problemSet.value[currentIndex].value),
              0 as number
            );
      const tuningParameters = {
        probabilityOfCrossover: inputs.probabilityOfCrossover.value,
        probabilityOfMutation: inputs.probabilityOfMutation.value,
        populationSize: inputs.populationSize.value,
        numberOfGenerations: inputs.numberOfGenerations.value,
        elitism: inputs.elitism.value,
        tournamentRoundSize: inputs.tournamentRoundSize.value,
      };

      knapsackSolver = new GASolver(
        inputs.problemSetSize.value,
        fitnessFunction,
        tuningParameters
      );
      knapsackSolutionGenerator = knapsackSolver.solve();
    } catch (error: any) {
      GAErrorMessage.value = error.message;
    }
  }
});

let setIntervalId: NodeJS.Timeout | undefined;
watchEffect(() => {
  clearInterval(setIntervalId);
  if (GAPlaying.value) {
    setIntervalId = setInterval(() => {
      if (knapsackSolver && knapsackSolutionGenerator) {
        const iteratorResult = knapsackSolutionGenerator.next();
        if (!iteratorResult.done) {
          GAStatusMessage.value = iteratorResult.value;
          cards.currentGeneration.content = knapsackSolver.currentGeneration;
          cards.currentParents.content = knapsackSolver.currentParents;
          cards.currentChildren.content = knapsackSolver.currentChildren;
          cards.currentCompetitors.content = knapsackSolver.currentCompetitors;
          cards.nextGeneration.content = knapsackSolver.nextGeneration;
        } else {
          const optimumFitnessMessage = ` Optimum fitness: ${OPTIMUM_FITNESS.value}!`;
          if (!GAStatusMessage.value.includes(optimumFitnessMessage)) {
            GAStatusMessage.value += optimumFitnessMessage;
          }
          GAPlaying.value = false;
        }
      }
    }, GAStepTimeInterval.value * 1000);
  }
});

function trimMessage(message: string) {
  return message
    .replace("[", "")
    .replace("]", "")
    .replace("{", "")
    .replace("}", "")
    .replace(/1,/g, "1 ")
    .replace(/0,/g, "0 ")
    .replace('"bits":', "")
    .replace('"fitness":', " - ");
}
</script>

<template>
  <div v-if="!InGASession" class="flex flex-col w-full h-full -mt-2">
    <sl-input
      v-for="input of inputs"
      type="number"
      size="small"
      :label="input.placeholder"
      :value="input.value"
      @sl-input="input.value = $event.target.value"
      required
    ></sl-input>
    <sl-button variant="primary" @click="InGASession = true" class="py-4"
      >START GA</sl-button
    >
  </div>
  <div v-else class="w-full h-full text-[0.8rem]">
    <sl-card v-for="card of cards" class="w-[140px] ml-1">
      <div slot="header">{{ card.header }}</div>
      <div
        v-for="possibleSolutions of card.content"
        class=""
        style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto"
      >
        {{ trimMessage(JSON.stringify(possibleSolutions)) }}
      </div>
    </sl-card>
    <sl-card class="w-[140px] ml-1">
      <div slot="header">Control Center</div>
      <div class="flex justify-center">
        <sl-icon-button
          v-for="button of buttons"
          :name="
            typeof button.icon === 'object' ? button.icon.value : button.icon
          "
          label="Control"
          class="pt-2 text-[1.2rem]"
          @click="button.onClick"
        ></sl-icon-button>
      </div>
      <br />
      <div
        class="rounded-md text-center p-[0.6rem] border-[2px] border-solid"
        style="word-wrap: break-word; overflow-wrap: break-word; hyphens: auto"
      >
        {{ trimMessage(GAStatusMessage) }}
      </div>
    </sl-card>
  </div>
</template>
