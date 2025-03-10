import { indexOfObjByAttr } from "./helpers";
import { Term } from "./term";

/**
 * Describes a Linguistic Variable - parameter for fuzzy inference system
 * It is a linguistic expression (one or more words) labeling an information
 */
export class LinguisticVariable {
  /**
   * @param {string} name
   * @param {Array.<Number>} range
   * @param {Array.<Term>} terms
   */
  constructor(name, range = [0, 1], terms = []) {
    if (!name) throw new Error("Linguistic Variable must be named");
    this.name = name;
    this.range = range;
    this.terms = terms;
  }

  /**
   * @param {Term} term
   */
  addTerm(term) {
    if (!(term instanceof Term))
      throw new Error(`addTerm: ${term} is not an instance of Term.`);
    this.terms.push(term);
  }

  /**
   * @param {string} termName
   * @returns {Term|null}
   */
  findTerm(termName) {
    let index = indexOfObjByAttr(this.terms, "name", termName);
    if (index > -1) {
      return this.terms[index];
    }

    return null;
  }

  /**
   * @param {string} termName
   * @returns {boolean} is removal was success
   */
  removeTerm(termName) {
    let index = indexOfObjByAttr(this.terms, "name", termName);
    if (index > -1) {
      this.terms.splice(index, 1);
      return true;
    }

    return false;
  }
}
