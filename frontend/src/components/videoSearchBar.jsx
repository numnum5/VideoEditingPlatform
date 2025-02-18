import { Input, InputGroup, InputGroupText} from "reactstrap";
import { useState } from "react";
import { FaSearch } from 'react-icons/fa'

// Component for displaying search bar
export default function VideoSearchBar({ onSearch }){
  const [query, setQuery] = useState('');

  const handleKeyDown = (e) => {
  // Handle query when user presses enter on their keyboard
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearch(query);
      setQuery('');
    }
  };

  return (
    <InputGroup>
      <InputGroupText>
        <FaSearch />
      </InputGroupText>
      <Input
        type="text"
        placeholder="Search videos..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
      />
    </InputGroup>
  );
};  