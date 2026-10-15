// Public API of the people directory feature.
export { PeoplePage } from "./pages/PeoplePage";
export { usePeople, useCelebrations, peopleKeys } from "./hooks/usePeople";
export { Celebrations } from "./components/Celebrations";
export type { Celebration, PeopleQuery, Person, PersonTeam } from "./services/peopleService";
