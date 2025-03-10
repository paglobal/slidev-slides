export type PossibleSolution = { bits: Array<0 | 1>; fitness: number };
type FitnessFunction = (
  possibleSolutionBits: PossibleSolution["bits"]
) => number;
type TuningParameters = {
  numberOfGenerations: number;
  probabilityOfCrossover: number;
  probabilityOfMutation: number;
  populationSize: number;
  elitism: number;
  tournamentRoundSize: number;
};
type MessageYieldingGenerator<T> = Generator<string, T, void>;
export type ProblemSet = Array<{ weight: number; value: number }>;

export class GASolver {
  problemSetLength: number;
  calculateFitness: (possibleSolutionBits: PossibleSolution["bits"]) => number;
  currentParents: Array<PossibleSolution> = [];
  currentChildren: Array<PossibleSolution> = [];
  currentGeneration: Array<PossibleSolution> = [];
  nextGeneration: Array<PossibleSolution> = [];
  currentCompetitors: Array<PossibleSolution> = [];
  tuningParameters: TuningParameters;

  constructor(
    problemSetLength: number,
    fitnessFunction: FitnessFunction,
    tuningParameters: TuningParameters
  ) {
    tuningParameters.populationSize = Math.round(
      tuningParameters.populationSize
    );
    tuningParameters.elitism = Math.round(tuningParameters.elitism);
    tuningParameters.tournamentRoundSize = Math.round(
      tuningParameters.tournamentRoundSize
    );
    tuningParameters.numberOfGenerations = Math.round(
      tuningParameters.numberOfGenerations
    );
    if (tuningParameters.elitism >= tuningParameters.populationSize) {
      throw new Error(
        "Elitism cannot be greater than or equal to population size!"
      );
    }
    if (
      tuningParameters.tournamentRoundSize >= tuningParameters.populationSize
    ) {
      throw new Error(
        "Tournament size cannot be greater than or equal to population size!"
      );
    }
    Object.keys(tuningParameters).forEach((tuningParameterKey) => {
      if (tuningParameters[tuningParameterKey as keyof TuningParameters] < 0) {
        throw new Error("All tuning parameters must be positive!");
      }
    });
    if (
      tuningParameters.probabilityOfCrossover > 1
      // TODO: maybe make it impossible to set this parameter to 0
      // || tuningParameters.probabilityOfCrossover === 0
    ) {
      throw new Error("Probability of crossover cannot be greater than 1!");
    }
    if (tuningParameters.probabilityOfMutation >= 1) {
      throw new Error(
        "Probability of mutation cannot be greater than or equal to 1!"
      );
    }
    this.tuningParameters = tuningParameters;
    this.problemSetLength = problemSetLength;
    this.calculateFitness = fitnessFunction;
  }

  evaluateProbability(probability: number) {
    return probability <= Math.random() ? false : true;
  }

  getElites() {
    return this.currentGeneration
      .toSorted((a, b) => b.fitness - a.fitness)
      .slice(0, this.tuningParameters.elitism);
  }

  *getNextParent(): MessageYieldingGenerator<PossibleSolution> {
    yield "New competitors incoming!";
    const randomIndexArray: Array<number> = [];
    for (let i = 0; i < this.tuningParameters.tournamentRoundSize; i++) {
      let randomIndex = this.getRandomIndex(this.currentGeneration);
      while (randomIndexArray.includes(randomIndex)) {
        randomIndex = this.getRandomIndex(this.currentGeneration);
      }
      randomIndexArray.push(randomIndex);
    }
    this.currentCompetitors = randomIndexArray.map(
      (randomIndex) => this.currentGeneration[randomIndex]
    );
    yield "New tournament players selected!";
    let nextParent = this.currentGeneration[randomIndexArray[0]];
    randomIndexArray.forEach((randomIndex) => {
      const possibleNextParent = this.currentGeneration[randomIndex];
      if (possibleNextParent.fitness > nextParent.fitness) {
        nextParent = possibleNextParent;
      }
    });

    return nextParent;
  }

  getRandomIndex(array: Array<unknown>) {
    return Math.floor(Math.random() * array.length);
  }

  getRandomizedGeneration() {
    const randomizedGeneration: Array<PossibleSolution> = [];
    for (let i = 0; i < this.tuningParameters.populationSize; i++) {
      const possibleSolutionBits: PossibleSolution["bits"] = [];
      for (let j = 0; j < this.problemSetLength; j++) {
        const randomBinary = Math.random() < 0.5 ? 0 : 1;
        possibleSolutionBits.push(randomBinary);
      }
      const possibleSolutionFitness =
        this.calculateFitness(possibleSolutionBits);
      randomizedGeneration.push({
        bits: possibleSolutionBits,
        fitness: possibleSolutionFitness,
      });
    }

    return randomizedGeneration;
  }

  *procreateAndMutate(): MessageYieldingGenerator<void> {
    yield "New children incoming!";
    for (let i = 0; i < 2; i++) {
      const crossover = this.evaluateProbability(
        this.tuningParameters.probabilityOfCrossover
      );
      const populationSizeReached =
        this.tuningParameters.populationSize === this.nextGeneration.length
          ? true
          : false;
      if (populationSizeReached) {
        break;
      }
      const randomIndex = this.getRandomIndex(this.currentParents);
      let birthedChild = structuredClone(this.currentParents[randomIndex]);
      if (crossover) {
        const crossoverPoint = Math.max(
          this.getRandomIndex(birthedChild.bits) - 1,
          0
        );
        const birthedChildBits = [
          ...this.currentParents[0].bits.slice(0, crossoverPoint),
          ...this.currentParents[1].bits.slice(
            crossoverPoint,
            this.problemSetLength
          ),
        ];
        const birthedChildFitness = this.calculateFitness(birthedChildBits);
        birthedChild = { bits: birthedChildBits, fitness: birthedChildFitness };
        yield "Child being birthed with crossover!";
      } else {
        yield "Child being birthed without crossover!";
      }
      this.currentChildren.push(birthedChild);
      yield "Child birthed!";
      for (let i = 0; i < birthedChild.bits.length; i++) {
        const bit = birthedChild.bits[i];
        const mutate = this.evaluateProbability(
          this.tuningParameters.probabilityOfMutation
        );
        if (mutate) {
          birthedChild.bits[i] = bit === 0 ? 1 : 0;
          birthedChild.fitness = this.calculateFitness(birthedChild.bits);
          yield `Child mutated at bit ${i + 1}!`;
        }
      }
    }
    this.nextGeneration.push(...this.currentChildren);
    yield "Procreation finished, new children added to next generation!";
  }

  *runProcreationTournament(): MessageYieldingGenerator<void> {
    while (this.nextGeneration.length < this.tuningParameters.populationSize) {
      yield* this.selectNextParents();
      yield* this.procreateAndMutate();
    }
  }

  *selectNextParents(): MessageYieldingGenerator<void> {
    this.currentParents = [];
    this.currentChildren = [];
    this.currentCompetitors = [];
    yield "New parents incoming!";
    this.currentParents = [yield* this.getNextParent()];
    yield "New parent selected!";
    let nextParent = yield* this.getNextParent();
    while (nextParent === this.currentParents[0]) {
      yield "Winner of previous tournament rejected due to lack of variation!";
      nextParent = yield* this.getNextParent();
    }
    this.currentParents.push(nextParent);
    yield "New parent selected!";
  }

  *solve(): MessageYieldingGenerator<PossibleSolution> {
    this.currentGeneration = this.getRandomizedGeneration();
    yield "Population initialized with varying individuals!";
    for (let i = 0; i < this.tuningParameters.numberOfGenerations; i++) {
      this.nextGeneration.push(...structuredClone(this.getElites()));
      yield "Elites selected!";
      yield "Procreation tournament started!";
      yield* this.runProcreationTournament();
      yield "Population size reached, procreation tournament finished!";
      this.currentGeneration = this.nextGeneration;
      this.nextGeneration = [];
      yield "Current generation replaced!";
    }
    const selectedSolution = this.getElites()[0];
    yield `Last generation encountered, solution selected: ${JSON.stringify(
      selectedSolution.bits
    )} with fitness: ${selectedSolution.fitness}!`;

    return selectedSolution;
  }
}
