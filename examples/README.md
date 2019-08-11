# Example 1

% LilyBin
\score {
  {
    \new RhythmicStaff {
	    \time 4/4
	    c4 c8 c c16 c c8 c4
    }
	  \addlyrics {
      fly bee ant fly bee ant bug
    }
  }
  \layout{}
}

# Example 2

% LilyBin
\score {
  {
    \new RhythmicStaff {
	    \time 5/4
	    \tuplet 5/4 { c4 \tuplet 2/3 { c \tuplet 3/2 { c8 c c } } r c } c c
    }
  }
  \layout{}
}
