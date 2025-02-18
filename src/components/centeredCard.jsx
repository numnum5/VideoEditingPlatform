import { Card } from "@radix-ui/themes";

// A component for displaying centered text on a div /card
export default function CenteredTextCard({height, fontSize, message}){

    const cardStyle = {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: `${height}px`,
      width: '100%',
    };

    const textStyle = {
      fontSize: fontSize,
      fontWeight: 'bold',
      textAlign: 'center',
    }
    return (
      <Card style={cardStyle}>
        <div style={textStyle}>{message}</div>
      </Card>
    );
  };