import { NewsCluster, BiasRating } from '../types';

export const getBlindspotSide = (cluster: NewsCluster): 'Left' | 'Right' | null => {
  if (!cluster.biasDistribution || !cluster.articles) {
    return null;
  }

  const { left: leftCoverage, right: rightCoverage } = cluster.biasDistribution;

  const leftSourcesCount = cluster.articles.filter(
    (a) => a.source.bias === BiasRating.LEFT || a.source.bias === BiasRating.LEAN_LEFT
  ).length;

  const rightSourcesCount = cluster.articles.filter(
    (a) => a.source.bias === BiasRating.RIGHT || a.source.bias === BiasRating.LEAN_RIGHT
  ).length;

  const thirtyOverThirtySeven = 30 / 37;

  // Check for Left Blindspot (underreported by the Left)
  if (
    leftSourcesCount < 10 &&
    rightCoverage >= 33 &&
    leftCoverage <= (rightCoverage - 33) * thirtyOverThirtySeven
  ) {
    return 'Left';
  }

  // Check for Right Blindspot (underreported by the Right)
  if (
    rightSourcesCount < 10 &&
    leftCoverage >= 33 &&
    rightCoverage <= (leftCoverage - 33) * thirtyOverThirtySeven
  ) {
    return 'Right';
  }

  return null;
};