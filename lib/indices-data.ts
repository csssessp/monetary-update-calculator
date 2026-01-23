export interface IndiceData {
  mes: number
  ano: number
  valor: number
  isReajusteIGPM?: boolean // Marcador para indicar reajuste IGP-M a cada 12 meses
  indiceOriginal?: number // Índice original antes do reajuste IGP-M
  igpmReajuste?: number // Valor do reajuste IGP-M acumulado
}

// Mantemos seu dataset local como fallback de confiabilidade.
export const indicesData = {
  "IGP-M": [
    // 1989 (a partir de janeiro)
    { mes: 1, ano: 1989, valor: 19.68 },
    { mes: 2, ano: 1989, valor: 35.91 },
    { mes: 3, ano: 1989, valor: 36.92 },
    { mes: 4, ano: 1989, valor: 39.92 },
    { mes: 5, ano: 1989, valor: 40.64 },
    { mes: 6, ano: 1989, valor: 40.48 },
    { mes: 7, ano: 1989, valor: 47.13 },
    // 1990
    { mes: 1, ano: 1990, valor: 61.46 },
    { mes: 2, ano: 1990, valor: 81.29 },
    { mes: 3, ano: 1990, valor: 83.95 },
    { mes: 4, ano: 1990, valor: 28.35 },
    { mes: 5, ano: 1990, valor: 5.93 },
    { mes: 6, ano: 1990, valor: 9.94 },
    { mes: 7, ano: 1990, valor: 12.01 },
    { mes: 8, ano: 1990, valor: 13.62 },
    { mes: 9, ano: 1990, valor: 12.8 },
    { mes: 10, ano: 1990, valor: 12.97 },
    { mes: 11, ano: 1990, valor: 16.86 },
    { mes: 12, ano: 1990, valor: 18.0 },
    // 1991
    { mes: 1, ano: 1991, valor: 17.7 },
    { mes: 2, ano: 1991, valor: 21.02 },
    { mes: 3, ano: 1991, valor: 9.19 },
    { mes: 4, ano: 1991, valor: 7.81 },
    { mes: 5, ano: 1991, valor: 7.48 },
    { mes: 6, ano: 1991, valor: 8.48 },
    { mes: 7, ano: 1991, valor: 13.22 },
    { mes: 8, ano: 1991, valor: 15.25 },
    { mes: 9, ano: 1991, valor: 14.93 },
    { mes: 10, ano: 1991, valor: 22.63 },
    { mes: 11, ano: 2011, valor: 25.62 },
    { mes: 12, ano: 2011, valor: 23.63 },
    // 1992
    { mes: 1, ano: 1992, valor: 23.56 },
    { mes: 2, ano: 1992, valor: 27.86 },
    { mes: 3, ano: 1992, valor: 21.39 },
    { mes: 4, ano: 1992, valor: 19.94 },
    { mes: 5, ano: 1992, valor: 20.43 },
    { mes: 6, ano: 1992, valor: 23.61 },
    { mes: 7, ano: 1992, valor: 21.84 },
    { mes: 8, ano: 1992, valor: 24.63 },
    { mes: 9, ano: 1992, valor: 25.27 },
    { mes: 10, ano: 1992, valor: 26.76 },
    { mes: 11, ano: 1992, valor: 23.43 },
    { mes: 12, ano: 1992, valor: 25.08 },
    // 1993
    { mes: 1, ano: 1993, valor: 25.83 },
    { mes: 2, ano: 1993, valor: 28.41 },
    { mes: 3, ano: 1993, valor: 26.25 },
    { mes: 4, ano: 1993, valor: 28.83 },
    { mes: 5, ano: 1993, valor: 29.7 },
    { mes: 6, ano: 1993, valor: 31.5 },
    { mes: 7, ano: 1993, valor: 31.25 },
    { mes: 8, ano: 1993, valor: 31.79 },
    { mes: 9, ano: 1993, valor: 35.28 },
    { mes: 10, ano: 1993, valor: 35.04 },
    { mes: 11, ano: 1993, valor: 36.15 },
    { mes: 12, ano: 1993, valor: 38.32 },
    // 1994
    { mes: 1, ano: 1994, valor: 39.07 },
    { mes: 2, ano: 1994, valor: 40.78 },
    { mes: 3, ano: 1994, valor: 45.71 },
    { mes: 4, ano: 1994, valor: 40.91 },
    { mes: 5, ano: 1994, valor: 42.58 },
    { mes: 6, ano: 1994, valor: 45.21 },
    { mes: 7, ano: 1994, valor: 4.33 },
    { mes: 8, ano: 1994, valor: 3.94 },
    { mes: 9, ano: 1994, valor: 1.75 },
    { mes: 10, ano: 1994, valor: 1.82 },
    { mes: 11, ano: 1994, valor: 2.85 },
    { mes: 12, ano: 1994, valor: 0.84 },
    // 1995
    { mes: 1, ano: 1995, valor: 0.92 },
    { mes: 2, ano: 1995, valor: 1.39 },
    { mes: 3, ano: 1995, valor: 1.12 },
    { mes: 4, ano: 1995, valor: 2.1 },
    { mes: 5, ano: 1995, valor: 0.58 },
    { mes: 6, ano: 1995, valor: 2.46 },
    { mes: 7, ano: 1995, valor: 1.82 },
    { mes: 8, ano: 1995, valor: 2.2 },
    { mes: 9, ano: 1995, valor: -0.71 },
    { mes: 10, ano: 1995, valor: 0.52 },
    { mes: 11, ano: 1995, valor: 1.2 },
    { mes: 12, ano: 1995, valor: 0.71 },
    // 1996
    { mes: 1, ano: 1996, valor: 1.73 },
    { mes: 2, ano: 1996, valor: 0.97 },
    { mes: 3, ano: 1996, valor: 0.4 },
    { mes: 4, ano: 1996, valor: 0.32 },
    { mes: 5, ano: 1996, valor: 1.55 },
    { mes: 6, ano: 1996, valor: 1.02 },
    { mes: 7, ano: 1996, valor: 1.35 },
    { mes: 8, ano: 1996, valor: 0.28 },
    { mes: 9, ano: 1996, valor: 0.1 },
    { mes: 10, ano: 1996, valor: 0.19 },
    { mes: 11, ano: 1996, valor: 0.2 },
    { mes: 12, ano: 1996, valor: 0.73 },
    // 1997
    { mes: 1, ano: 1997, valor: 1.77 },
    { mes: 2, ano: 1997, valor: 0.43 },
    { mes: 3, ano: 1997, valor: 1.15 },
    { mes: 4, ano: 1997, valor: 0.68 },
    { mes: 5, ano: 1997, valor: 0.21 },
    { mes: 6, ano: 1997, valor: 0.74 },
    { mes: 7, ano: 1997, valor: 0.09 },
    { mes: 8, ano: 1997, valor: 0.09 },
    { mes: 9, ano: 1997, valor: 0.48 },
    { mes: 10, ano: 1997, valor: 0.37 },
    { mes: 11, ano: 1997, valor: 0.64 },
    { mes: 12, ano: 1997, valor: 0.84 },
    // 1998
    { mes: 1, ano: 1998, valor: 0.96 },
    { mes: 2, ano: 1998, valor: 0.18 },
    { mes: 3, ano: 1998, valor: 0.19 },
    { mes: 4, ano: 1998, valor: 0.13 },
    { mes: 5, ano: 1998, valor: 0.14 },
    { mes: 6, ano: 1998, valor: 0.38 },
    { mes: 7, ano: 1998, valor: -0.17 },
    { mes: 8, ano: 1998, valor: -0.16 },
    { mes: 9, ano: 1998, valor: -0.08 },
    { mes: 10, ano: 1998, valor: 0.08 },
    { mes: 11, ano: 1998, valor: -0.32 },
    { mes: 12, ano: 1998, valor: 0.45 },
    // 1999
    { mes: 1, ano: 1999, valor: 0.84 },
    { mes: 2, ano: 1999, valor: 3.61 },
    { mes: 3, ano: 1999, valor: 2.83 },
    { mes: 4, ano: 1999, valor: 0.71 },
    { mes: 5, ano: 1999, valor: -0.29 },
    { mes: 6, ano: 1999, valor: 0.36 },
    { mes: 7, ano: 1999, valor: 1.55 },
    { mes: 8, ano: 1999, valor: 1.56 },
    { mes: 9, ano: 1999, valor: 1.45 },
    { mes: 10, ano: 1999, valor: 1.7 },
    { mes: 11, ano: 1999, valor: 2.39 },
    { mes: 12, ano: 1999, valor: 1.81 },
    // 2000
    { mes: 1, ano: 2000, valor: 1.24 },
    { mes: 2, ano: 2000, valor: 0.35 },
    { mes: 3, ano: 2000, valor: 0.15 },
    { mes: 4, ano: 2000, valor: 0.23 },
    { mes: 5, ano: 2000, valor: 0.31 },
    { mes: 6, ano: 2000, valor: 0.85 },
    { mes: 7, ano: 2000, valor: 1.57 },
    { mes: 8, ano: 2000, valor: 2.39 },
    { mes: 9, ano: 2000, valor: 1.16 },
    { mes: 10, ano: 2000, valor: 0.38 },
    { mes: 11, ano: 2000, valor: 0.29 },
    { mes: 12, ano: 2000, valor: 0.63 },
    // 2001
    { mes: 1, ano: 2001, valor: 0.62 },
    { mes: 2, ano: 2001, valor: 0.23 },
    { mes: 3, ano: 2001, valor: 0.56 },
    { mes: 4, ano: 2001, valor: 1.0 },
    { mes: 5, ano: 2001, valor: 0.86 },
    { mes: 6, ano: 2001, valor: 0.98 },
    { mes: 7, ano: 2001, valor: 1.48 },
    { mes: 8, ano: 2001, valor: 1.38 },
    { mes: 9, ano: 2001, valor: 0.31 },
    { mes: 10, ano: 2001, valor: 1.18 },
    { mes: 11, ano: 2001, valor: 1.1 },
    { mes: 12, ano: 2001, valor: 0.22 },
    // 2002
    { mes: 1, ano: 2002, valor: 0.36 },
    { mes: 2, ano: 2002, valor: 0.06 },
    { mes: 3, ano: 2002, valor: 0.09 },
    { mes: 4, ano: 2002, valor: 0.56 },
    { mes: 5, ano: 2002, valor: 0.83 },
    { mes: 6, ano: 2002, valor: 1.54 },
    { mes: 7, ano: 2002, valor: 1.95 },
    { mes: 8, ano: 2002, valor: 2.32 },
    { mes: 9, ano: 2002, valor: 2.4 },
    { mes: 10, ano: 2002, valor: 3.87 },
    { mes: 11, ano: 2002, valor: 5.19 },
    { mes: 12, ano: 2002, valor: 3.75 },
    // 2003
    { mes: 1, ano: 2003, valor: 2.33 },
    { mes: 2, ano: 2003, valor: 2.28 },
    { mes: 3, ano: 2003, valor: 1.53 },
    { mes: 4, ano: 2003, valor: 0.92 },
    { mes: 5, ano: 2003, valor: -0.26 },
    { mes: 6, ano: 2003, valor: -1.0 },
    { mes: 7, ano: 2003, valor: -0.42 },
    { mes: 8, ano: 2003, valor: 0.38 },
    { mes: 9, ano: 2003, valor: 1.18 },
    { mes: 10, ano: 2003, valor: 0.38 },
    { mes: 11, ano: 2003, valor: 0.49 },
    { mes: 12, ano: 2003, valor: 0.61 },
    // 2004
    { mes: 1, ano: 2004, valor: 0.88 },
    { mes: 2, ano: 2004, valor: 0.69 },
    { mes: 3, ano: 2004, valor: 1.13 },
    { mes: 4, ano: 2004, valor: 1.21 },
    { mes: 5, ano: 2004, valor: 1.31 },
    { mes: 6, ano: 2004, valor: 1.38 },
    { mes: 7, ano: 2004, valor: 1.31 },
    { mes: 8, ano: 2004, valor: 1.22 },
    { mes: 9, ano: 2004, valor: 0.69 },
    { mes: 10, ano: 2004, valor: 0.39 },
    { mes: 11, ano: 2004, valor: 0.82 },
    { mes: 12, ano: 2004, valor: 0.74 },
    // 2005
    { mes: 1, ano: 2005, valor: 0.39 },
    { mes: 2, ano: 2005, valor: 0.3 },
    { mes: 3, ano: 2005, valor: 0.85 },
    { mes: 4, ano: 2005, valor: 0.86 },
    { mes: 5, ano: 2005, valor: -0.22 },
    { mes: 6, ano: 2005, valor: -0.44 },
    { mes: 7, ano: 2005, valor: -0.34 },
    { mes: 8, ano: 2005, valor: -0.65 },
    { mes: 9, ano: 2005, valor: -0.53 },
    { mes: 10, ano: 2005, valor: 0.6 },
    { mes: 11, ano: 2005, valor: 0.4 },
    { mes: 12, ano: 2005, valor: -0.01 },
    // 2006
    { mes: 1, ano: 2006, valor: 0.92 },
    { mes: 2, ano: 2006, valor: 0.01 },
    { mes: 3, ano: 2006, valor: -0.23 },
    { mes: 4, ano: 2006, valor: -0.42 },
    { mes: 5, ano: 2006, valor: 0.38 },
    { mes: 6, ano: 2006, valor: 0.75 },
    { mes: 7, ano: 2006, valor: 0.18 },
    { mes: 8, ano: 2006, valor: 0.37 },
    { mes: 9, ano: 2006, valor: 0.29 },
    { mes: 10, ano: 2006, valor: 0.47 },
    { mes: 11, ano: 2006, valor: 0.75 },
    { mes: 12, ano: 2006, valor: 0.32 },
    // 2007
    { mes: 1, ano: 2007, valor: 0.5 },
    { mes: 2, ano: 2007, valor: 0.27 },
    { mes: 3, ano: 2007, valor: 0.34 },
    { mes: 4, ano: 2007, valor: 0.04 },
    { mes: 5, ano: 2007, valor: 0.04 },
    { mes: 6, ano: 2007, valor: 0.26 },
    { mes: 7, ano: 2007, valor: 0.28 },
    { mes: 8, ano: 2007, valor: 0.98 },
    { mes: 9, ano: 2007, valor: 1.29 },
    { mes: 10, ano: 2007, valor: 1.05 },
    { mes: 11, ano: 2007, valor: 0.69 },
    { mes: 12, ano: 2007, valor: 1.76 },
    // 2008
    { mes: 1, ano: 2008, valor: 1.09 },
    { mes: 2, ano: 2008, valor: 0.53 },
    { mes: 3, ano: 2008, valor: 0.74 },
    { mes: 4, ano: 2008, valor: 0.69 },
    { mes: 5, ano: 2008, valor: 1.61 },
    { mes: 6, ano: 2008, valor: 1.98 },
    { mes: 7, ano: 2008, valor: 1.76 },
    { mes: 8, ano: 2008, valor: -0.32 },
    { mes: 9, ano: 2008, valor: 0.11 },
    { mes: 10, ano: 2008, valor: 0.98 },
    { mes: 11, ano: 2008, valor: 0.38 },
    { mes: 12, ano: 2008, valor: -0.13 },
    // 2009
    { mes: 1, ano: 2009, valor: -0.44 },
    { mes: 2, ano: 2009, valor: 0.26 },
    { mes: 3, ano: 2009, valor: -0.74 },
    { mes: 4, ano: 2009, valor: -0.15 },
    { mes: 5, ano: 2009, valor: -0.07 },
    { mes: 6, ano: 2009, valor: -0.1 },
    { mes: 7, ano: 2009, valor: -0.43 },
    { mes: 8, ano: 2009, valor: -0.36 },
    { mes: 9, ano: 2009, valor: 0.42 },
    { mes: 10, ano: 2009, valor: 0.05 },
    { mes: 11, ano: 2009, valor: 0.1 },
    { mes: 12, ano: 2009, valor: -0.26 },
    // 2010
    { mes: 1, ano: 2010, valor: 0.63 },
    { mes: 2, ano: 2010, valor: 1.18 },
    { mes: 3, ano: 2010, valor: 0.94 },
    { mes: 4, ano: 2010, valor: 0.77 },
    { mes: 5, ano: 2010, valor: 1.19 },
    { mes: 6, ano: 2010, valor: 0.85 },
    { mes: 7, ano: 2010, valor: 0.15 },
    { mes: 8, ano: 2010, valor: 0.77 },
    { mes: 9, ano: 2010, valor: 1.15 },
    { mes: 10, ano: 2010, valor: 1.01 },
    { mes: 11, ano: 2010, valor: 1.45 },
    { mes: 12, ano: 2010, valor: 0.69 },
    // 2011
    { mes: 1, ano: 2011, valor: 0.79 },
    { mes: 2, ano: 2011, valor: 1.0 },
    { mes: 3, ano: 2011, valor: 0.62 },
    { mes: 4, ano: 2011, valor: 0.45 },
    { mes: 5, ano: 2011, valor: 0.43 },
    { mes: 6, ano: 2011, valor: -0.18 },
    { mes: 7, ano: 2011, valor: -0.12 },
    { mes: 8, ano: 2011, valor: 0.44 },
    { mes: 9, ano: 2011, valor: 0.65 },
    { mes: 10, ano: 2011, valor: 0.53 },
    { mes: 11, ano: 2011, valor: 0.5 },
    { mes: 12, ano: 2011, valor: -0.12 },
    // 2012
    { mes: 1, ano: 2012, valor: 0.25 },
    { mes: 2, ano: 2012, valor: -0.06 },
    { mes: 3, ano: 2012, valor: 0.43 },
    { mes: 4, ano: 2012, valor: 0.85 },
    { mes: 5, ano: 2012, valor: 1.02 },
    { mes: 6, ano: 2012, valor: 0.66 },
    { mes: 7, ano: 2012, valor: 1.34 },
    { mes: 8, ano: 2012, valor: 1.43 },
    { mes: 9, ano: 2012, valor: 0.97 },
    { mes: 10, ano: 2012, valor: 0.02 },
    { mes: 11, ano: 2012, valor: -0.03 },
    { mes: 12, ano: 2012, valor: 0.68 },
    // 2013
    { mes: 1, ano: 2013, valor: 0.34 },
    { mes: 2, ano: 2013, valor: 0.29 },
    { mes: 3, ano: 2013, valor: 0.21 },
    { mes: 4, ano: 2013, valor: 0.15 },
    { mes: 5, ano: 2013, valor: 0.0 },
    { mes: 6, ano: 2013, valor: 0.75 },
    { mes: 7, ano: 2013, valor: 0.26 },
    { mes: 8, ano: 2013, valor: 0.15 },
    { mes: 9, ano: 2013, valor: 1.5 },
    { mes: 10, ano: 2013, valor: 0.86 },
    { mes: 11, ano: 2013, valor: 0.29 },
    { mes: 12, ano: 2013, valor: 0.6 },
    // 2014
    { mes: 1, ano: 2014, valor: 0.48 },
    { mes: 2, ano: 2014, valor: 0.38 },
    { mes: 3, ano: 2014, valor: 1.67 },
    { mes: 4, ano: 2014, valor: 0.78 },
    { mes: 5, ano: 2014, valor: -0.13 },
    { mes: 6, ano: 2014, valor: -0.74 },
    { mes: 7, ano: 2014, valor: -0.61 },
    { mes: 8, ano: 2014, valor: -0.27 },
    { mes: 9, ano: 2014, valor: 0.2 },
    { mes: 10, ano: 2014, valor: 0.28 },
    { mes: 11, ano: 2014, valor: 0.98 },
    { mes: 12, ano: 2014, valor: 0.62 },
    // 2015
    { mes: 1, ano: 2015, valor: 0.76 },
    { mes: 2, ano: 2015, valor: 0.27 },
    { mes: 3, ano: 2015, valor: 0.98 },
    { mes: 4, ano: 2015, valor: 1.17 },
    { mes: 5, ano: 2015, valor: 0.41 },
    { mes: 6, ano: 2015, valor: 0.67 },
    { mes: 7, ano: 2015, valor: 0.69 },
    { mes: 8, ano: 2015, valor: 0.28 },
    { mes: 9, ano: 2015, valor: 0.95 },
    { mes: 10, ano: 2015, valor: 1.89 },
    { mes: 11, ano: 2015, valor: 1.52 },
    { mes: 12, ano: 2015, valor: 0.49 },
    // 2016
    { mes: 1, ano: 2016, valor: 1.14 },
    { mes: 2, ano: 2016, valor: 1.29 },
    { mes: 3, ano: 2016, valor: 0.51 },
    { mes: 4, ano: 2016, valor: 0.33 },
    { mes: 5, ano: 2016, valor: 0.82 },
    { mes: 6, ano: 2016, valor: 1.69 },
    { mes: 7, ano: 2016, valor: 0.18 },
    { mes: 8, ano: 2016, valor: 0.15 },
    { mes: 9, ano: 2016, valor: 0.2 },
    { mes: 10, ano: 2016, valor: 0.16 },
    { mes: 11, ano: 2016, valor: -0.03 },
    { mes: 12, ano: 2016, valor: 0.54 },
    // 2017
    { mes: 1, ano: 2017, valor: 0.64 },
    { mes: 2, ano: 2017, valor: 0.08 },
    { mes: 3, ano: 2017, valor: 0.01 },
    { mes: 4, ano: 2017, valor: -1.1 },
    { mes: 5, ano: 2017, valor: -0.93 },
    { mes: 6, ano: 2017, valor: -0.67 },
    { mes: 7, ano: 2017, valor: -0.72 },
    { mes: 8, ano: 2017, valor: 0.1 },
    { mes: 9, ano: 2017, valor: 0.47 },
    { mes: 10, ano: 2017, valor: 0.2 },
    { mes: 11, ano: 2017, valor: 0.52 },
    { mes: 12, ano: 2017, valor: 0.89 },
    // 2018
    { mes: 1, ano: 2018, valor: 0.76 },
    { mes: 2, ano: 2018, valor: 0.07 },
    { mes: 3, ano: 2018, valor: 0.64 },
    { mes: 4, ano: 2018, valor: 0.57 },
    { mes: 5, ano: 2018, valor: 1.38 },
    { mes: 6, ano: 2018, valor: 1.87 },
    { mes: 7, ano: 2018, valor: 0.51 },
    { mes: 8, ano: 2018, valor: 0.7 },
    { mes: 9, ano: 2018, valor: 1.52 },
    { mes: 10, ano: 2018, valor: 0.89 },
    { mes: 11, ano: 2018, valor: -0.49 },
    { mes: 12, ano: 2018, valor: -1.08 },
    // 2019
    { mes: 1, ano: 2019, valor: 0.01 },
    { mes: 2, ano: 2019, valor: 0.88 },
    { mes: 3, ano: 2019, valor: 1.26 },
    { mes: 4, ano: 2019, valor: 0.92 },
    { mes: 5, ano: 2019, valor: 0.45 },
    { mes: 6, ano: 2019, valor: 0.8 },
    { mes: 7, ano: 2019, valor: 0.4 },
    { mes: 8, ano: 2019, valor: -0.67 },
    { mes: 9, ano: 2019, valor: -0.01 },
    { mes: 10, ano: 2019, valor: 0.68 },
    { mes: 11, ano: 2019, valor: 0.3 },
    { mes: 12, ano: 2019, valor: 2.09 },
    // 2020
    { mes: 1, ano: 2020, valor: 0.48 },
    { mes: 2, ano: 2020, valor: -0.04 },
    { mes: 3, ano: 2020, valor: 1.24 },
    { mes: 4, ano: 2020, valor: 0.8 },
    { mes: 5, ano: 2020, valor: 0.28 },
    { mes: 6, ano: 2020, valor: 1.56 },
    { mes: 7, ano: 2020, valor: 2.23 },
    { mes: 8, ano: 2020, valor: 2.74 },
    { mes: 9, ano: 2020, valor: 4.34 },
    { mes: 10, ano: 2020, valor: 3.23 },
    { mes: 11, ano: 2020, valor: 3.28 },
    { mes: 12, ano: 2020, valor: 0.96 },
    // 2021
    { mes: 1, ano: 2021, valor: 2.58 },
    { mes: 2, ano: 2021, valor: 2.53 },
    { mes: 3, ano: 2021, valor: 2.94 },
    { mes: 4, ano: 2021, valor: 1.51 },
    { mes: 5, ano: 2021, valor: 4.1 },
    { mes: 6, ano: 2021, valor: 0.6 },
    { mes: 7, ano: 2021, valor: 0.78 },
    { mes: 8, ano: 2021, valor: 0.66 },
    { mes: 9, ano: 2021, valor: -0.64 },
    { mes: 10, ano: 2021, valor: 0.64 },
    { mes: 11, ano: 2021, valor: 0.02 },
    { mes: 12, ano: 2021, valor: 0.87 },
    // 2022
    { mes: 1, ano: 2022, valor: 1.82 },
    { mes: 2, ano: 2022, valor: 1.83 },
    { mes: 3, ano: 2022, valor: 1.74 },
    { mes: 4, ano: 2022, valor: 1.41 },
    { mes: 5, ano: 2022, valor: 0.52 },
    { mes: 6, ano: 2022, valor: 0.59 },
    { mes: 7, ano: 2022, valor: 0.21 },
    { mes: 8, ano: 2022, valor: -0.7 },
    { mes: 9, ano: 2022, valor: -0.95 },
    { mes: 10, ano: 2022, valor: -0.97 },
    { mes: 11, ano: 2022, valor: -0.56 },
    { mes: 12, ano: 2022, valor: 0.45 },
    // 2023
    { mes: 1, ano: 2023, valor: 0.21 },
    { mes: 2, ano: 2023, valor: -0.06 },
    { mes: 3, ano: 2023, valor: 0.05 },
    { mes: 4, ano: 2023, valor: -0.95 },
    { mes: 5, ano: 2023, valor: -1.84 },
    { mes: 6, ano: 2023, valor: -1.93 },
    { mes: 7, ano: 2023, valor: -0.72 },
    { mes: 8, ano: 2023, valor: -0.14 },
    { mes: 9, ano: 2023, valor: 0.37 },
    { mes: 10, ano: 2023, valor: 0.5 },
    { mes: 11, ano: 2023, valor: 0.59 },
    { mes: 12, ano: 2023, valor: 0.74 },
    // 2024
    { mes: 1, ano: 2024, valor: 0.07 },
    { mes: 2, ano: 2024, valor: -0.52 },
    { mes: 3, ano: 2024, valor: -0.47 },
    { mes: 4, ano: 2024, valor: 0.31 },
    { mes: 5, ano: 2024, valor: 0.89 },
    { mes: 6, ano: 2024, valor: 0.81 },
    { mes: 7, ano: 2024, valor: 0.61 },
    { mes: 8, ano: 2024, valor: 0.29 },
    { mes: 9, ano: 2024, valor: 0.62 },
    { mes: 10, ano: 2024, valor: 1.52 },
    { mes: 11, ano: 2024, valor: 1.3 },
    { mes: 12, ano: 2024, valor: 0.94 },
    // 2025
    { mes: 1, ano: 2025, valor: 0.27 },
    { mes: 2, ano: 2025, valor: 1.06 },
    { mes: 3, ano: 2025, valor: -0.34 },
    { mes: 4, ano: 2025, valor: 0.24 },
    { mes: 5, ano: 2025, valor: -0.49 },
    { mes: 6, ano: 2025, valor: -1.67 },
    { mes: 7, ano: 2025, valor: -0.77 }, // adicionado para cobrir jul/2025
    { mes: 8, ano: 2025, valor: 0.6564 },
    { mes: 9, ano: 2025, valor: 0.6564 },
    { mes: 10, ano: 2025, valor: 0.6564 },
    { mes: 11, ano: 2025, valor: 0.6564 },
    { mes: 12, ano: 2025, valor: 0.6564 },
  ],
  IPCA: [
    // 2020
    { mes: 1, ano: 2020, valor: 0.21 },
    { mes: 2, ano: 2020, valor: 0.25 },
    { mes: 3, ano: 2020, valor: 0.07 },
    { mes: 4, ano: 2020, valor: -0.31 },
    { mes: 5, ano: 2020, valor: -0.38 },
    { mes: 6, ano: 2020, valor: 0.26 },
    { mes: 7, ano: 2020, valor: 0.36 },
    { mes: 8, ano: 2020, valor: 0.24 },
    { mes: 9, ano: 2020, valor: 0.64 },
    { mes: 10, ano: 2020, valor: 0.86 },
    { mes: 11, ano: 2020, valor: 0.89 },
    { mes: 12, ano: 2020, valor: 1.35 },
    // 2021
    { mes: 1, ano: 2021, valor: 0.25 },
    { mes: 2, ano: 2021, valor: 0.86 },
    { mes: 3, ano: 2021, valor: 0.93 },
    { mes: 4, ano: 2021, valor: 0.31 },
    { mes: 5, ano: 2021, valor: 0.83 },
    { mes: 6, ano: 2021, valor: 0.53 },
    { mes: 7, ano: 2021, valor: 0.96 },
    { mes: 8, ano: 2021, valor: 0.87 },
    { mes: 9, ano: 2021, valor: 1.16 },
    { mes: 10, ano: 2021, valor: 1.25 },
    { mes: 11, ano: 2021, valor: 0.95 },
    { mes: 12, ano: 2021, valor: 0.73 },
    // 2022
    { mes: 1, ano: 2022, valor: 0.54 },
    { mes: 2, ano: 2022, valor: 1.01 },
    { mes: 3, ano: 2022, valor: 1.62 },
    { mes: 4, ano: 2022, valor: 1.06 },
    { mes: 5, ano: 2022, valor: 0.47 },
    { mes: 6, ano: 2022, valor: 0.67 },
    { mes: 7, ano: 2022, valor: -0.68 },
    { mes: 8, ano: 2022, valor: -0.36 },
    { mes: 9, ano: 2022, valor: -0.29 },
    { mes: 10, ano: 2022, valor: 0.59 },
    { mes: 11, ano: 2022, valor: 0.41 },
    { mes: 12, ano: 2022, valor: 0.62 },
    // 2023
    { mes: 1, ano: 2023, valor: 0.53 },
    { mes: 2, ano: 2023, valor: 0.84 },
    { mes: 3, ano: 2023, valor: 0.71 },
    { mes: 4, ano: 2023, valor: 0.61 },
    { mes: 5, ano: 2023, valor: 0.23 },
    { mes: 6, ano: 2023, valor: 0.08 },
    { mes: 7, ano: 2023, valor: 0.12 },
    { mes: 8, ano: 2023, valor: -0.02 },
    { mes: 9, ano: 2023, valor: 0.26 },
    { mes: 10, ano: 2023, valor: 0.24 },
    { mes: 11, ano: 2023, valor: 0.28 },
    { mes: 12, ano: 2023, valor: 0.56 },
    // 2024
    { mes: 1, ano: 2024, valor: 0.42 },
    { mes: 2, ano: 2024, valor: 0.83 },
    { mes: 3, ano: 2024, valor: 0.16 },
    { mes: 4, ano: 2024, valor: 0.38 },
    { mes: 5, ano: 2024, valor: 0.46 },
    { mes: 6, ano: 2024, valor: 0.21 },
    { mes: 7, ano: 2024, valor: 0.38 },
    { mes: 8, ano: 2024, valor: 0.02 },
    { mes: 9, ano: 2024, valor: 0.44 },
    { mes: 10, ano: 2024, valor: 0.56 },
    { mes: 11, ano: 2024, valor: 0.39 },
    { mes: 12, ano: 2024, valor: 0.52 },
    // 2025
    { mes: 1, ano: 2025, valor: 0.25 },
  ],
  INPC: [
    // 2020
    { mes: 1, ano: 2020, valor: 0.19 },
    { mes: 2, ano: 2020, valor: 0.18 },
    { mes: 3, ano: 2020, valor: 0.07 },
    { mes: 4, ano: 2020, valor: -0.28 },
    { mes: 5, ano: 2020, valor: -0.31 },
    { mes: 6, ano: 2020, valor: 0.02 },
    { mes: 7, ano: 2020, valor: 0.3 },
    { mes: 8, ano: 2020, valor: 0.24 },
    { mes: 9, ano: 2020, valor: 0.45 },
    { mes: 10, ano: 2020, valor: 0.89 },
    { mes: 11, ano: 2020, valor: 0.75 },
    { mes: 12, ano: 2020, valor: 1.35 },
    // 2021
    { mes: 1, ano: 2021, valor: 0.32 },
    { mes: 2, ano: 2021, valor: 0.86 },
    { mes: 3, ano: 2021, valor: 0.81 },
    { mes: 4, ano: 2021, valor: 0.37 },
    { mes: 5, ano: 2021, valor: 0.76 },
    { mes: 6, ano: 2021, valor: 0.51 },
    { mes: 7, ano: 2021, valor: 0.89 },
    { mes: 8, ano: 2021, valor: 0.87 },
    { mes: 9, ano: 2021, valor: 1.16 },
    { mes: 10, ano: 2021, valor: 1.25 },
    { mes: 11, ano: 2021, valor: 0.95 },
    { mes: 12, ano: 2021, valor: 0.73 },
    // 2022
    { mes: 1, ano: 2022, valor: 0.54 },
    { mes: 2, ano: 2022, valor: 1.01 },
    { mes: 3, ano: 2022, valor: 1.62 },
    { mes: 4, ano: 2022, valor: 1.06 },
    { mes: 5, ano: 2022, valor: 0.47 },
    { mes: 6, ano: 2022, valor: 0.67 },
    { mes: 7, ano: 2022, valor: -0.68 },
    { mes: 8, ano: 2022, valor: -0.36 },
    { mes: 9, ano: 2022, valor: -0.29 },
    { mes: 10, ano: 2022, valor: 0.59 },
    { mes: 11, ano: 2022, valor: 0.41 },
    { mes: 12, ano: 2022, valor: 0.62 },
    // 2023
    { mes: 1, ano: 2023, valor: 0.48 },
    { mes: 2, ano: 2023, valor: 0.92 },
    { mes: 3, ano: 2023, valor: 0.63 },
    { mes: 4, ano: 2023, valor: 0.57 },
    { mes: 5, ano: 2023, valor: 0.19 },
    { mes: 6, ano: 2023, valor: 0.11 },
    { mes: 7, ano: 2023, valor: 0.08 },
    { mes: 8, ano: 2023, valor: -0.05 },
    { mes: 9, ano: 2023, valor: 0.31 },
    { mes: 10, ano: 2023, valor: 0.28 },
    { mes: 11, ano: 2023, valor: 0.32 },
    { mes: 12, ano: 2023, valor: 0.61 },
    // 2024
    { mes: 1, ano: 2024, valor: 0.45 },
    { mes: 2, ano: 2024, valor: 0.89 },
    { mes: 3, ano: 2024, valor: 0.19 },
    { mes: 4, ano: 2024, valor: 0.42 },
    { mes: 5, ano: 2024, valor: 0.51 },
    { mes: 6, ano: 2024, valor: 0.18 },
    { mes: 7, ano: 2024, valor: 0.35 },
    { mes: 8, ano: 2024, valor: 0.05 },
    { mes: 9, ano: 2024, valor: 0.47 },
    { mes: 10, ano: 2024, valor: 0.52 },
    { mes: 11, ano: 2024, valor: 0.41 },
    { mes: 12, ano: 2024, valor: 0.48 },
    // 2025
    { mes: 1, ano: 2025, valor: 0.28 },
  ],
} as const

// Mapeamento de nomes completos para nomes curtos usados no DB
const indiceNomesMap: { [key: string]: string } = {
  "IGP-M (FGV)": "IGP-M",
}

export function getIndiceNome(indiceCompleto: string): string {
  // Apenas IGP-M é suportado (Poupança foi removida)
  return "IGP-M"
}

// Helper: filtra dataset local por intervalo
function filtrarLocal(nome: string, startMonth?: number, startYear?: number, endMonth?: number, endYear?: number) {
  const arr: IndiceData[] = (indicesData as any)[nome] || []
  if (!arr.length) return []
  return arr.filter((i) => {
    const afterStart = !startMonth || !startYear || i.ano > startYear || (i.ano === startYear && i.mes >= startMonth)
    const beforeEnd = !endMonth || !endYear || i.ano < endYear || (i.ano === endYear && i.mes <= endMonth)
    return afterStart && beforeEnd
  })
}

// Helper: constrói querystring sem “undefined”
function buildQuery(params: Record<string, number | string | undefined>) {
  const sp = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || (typeof v === "number" && !Number.isFinite(v))) return
    sp.set(k, String(v))
  })
  const qs = sp.toString()
  return qs ? `?${qs}` : ""
}

// Função auxiliar para buscar dados do banco de dados
async function fetchDB(name: string, startMonth?: number, startYear?: number, endMonth?: number, endYear?: number) {
  const qs = buildQuery({
    name: name,
    startMonth,
    startYear,
    endMonth,
    endYear,
  })
  const response = await fetch(`/api/indices${qs}`, { cache: "no-store" })
  if (!response.ok) return []
  const data = await response.json()
  if (!data?.success || !Array.isArray(data.indices)) return []

  const currentYear = new Date().getFullYear()
  const minYear = 1900 // Arbitrary minimum year for data validity

  return data.indices
    .map((item: any) => {
      // Garante que item é um objeto e tem as propriedades esperadas
      if (typeof item !== "object" || item === null || !("month" in item) || !("year" in item) || !("value" in item)) {
        console.warn("Item inválido recebido da API:", item)
        return null // Retorna null para itens inválidos
      }

      const mes = Number(item.month)
      const ano = Number(item.year)
      const valor = Number(item.value)

      // Validação rigorosa dos dados
      if (!Number.isFinite(mes) || mes < 1 || mes > 12) {
        console.warn("Mês inválido no item da API:", item)
        return null
      }
      if (!Number.isFinite(ano) || ano < minYear || ano > currentYear + 10) {
        console.warn("Ano inválido no item da API:", item)
        return null
      }
      if (!Number.isFinite(valor)) {
        console.warn("Valor inválido no item da API:", item)
        return null
      }

      return { mes, ano, valor }
    })
    .filter((item): item is IndiceData => item !== null) // Remove itens nulos
}

// Busca do DB; se vazio → fallback local
export async function obterIndicesAtualizados(
  nomeIndice: string,
  startMonth?: number,
  startYear?: number,
  endMonth?: number,
  endYear?: number,
): Promise<IndiceData[]> {
  const nomeCurto = getIndiceNome(nomeIndice)

  // PRIMEIRO: Tentar buscar dados reais do cache de sessão (localStorage no cliente)
  // Em server-side, usar sessionStorage via variável global
  let dadosReais: IndiceData[] = []
  
  try {
    // Verificar se estamos em cliente ou servidor
    if (typeof window !== "undefined") {
      // Cliente: tentar pegar do localStorage
      const cached = localStorage.getItem(`indices_${nomeCurto}`)
      if (cached) {
        dadosReais = JSON.parse(cached)
        console.log(`[CACHE] ${nomeCurto}: ${dadosReais.length} registros carregados do cache`)
      }
    }
  } catch (e) {
    // Silenciosamente ignorar erro de acesso ao localStorage
  }

  // Se não temos dados reais em cache, usar dados locais como fallback
  let indicesAUsar = dadosReais.length > 0 ? dadosReais : filtrarLocal(nomeCurto, startMonth, startYear, endMonth, endYear)

  indicesAUsar.sort((a, b) => {
    if (a.ano !== b.ano) return a.ano - b.ano
    return a.mes - b.mes
  })

  if (indicesAUsar.length === 0) {
    console.warn(`Nenhum dado encontrado para ${nomeIndice}. Usando dados locais como fallback.`)
    // Fallback para dados locais se nenhum foi encontrado
    indicesAUsar = filtrarLocal(nomeCurto, startMonth, startYear, endMonth, endYear)
  }

  return indicesAUsar
}

// Função de atualização automática removida, pois o usuário fará manualmente.
// export async function atualizarIndicesAutomaticamente(): Promise<boolean> { ... }
